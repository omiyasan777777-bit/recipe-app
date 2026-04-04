/**
 * Threads予約投稿ツール v4
 * - セキュリティ強化（Bearer認証、トークンマスキング、XSS防止）
 * - API共通ヘルパー
 * - 設定キャッシュ
 * - シート書式の共通化
 */

// ============================================
// カラム定義
// ============================================
// A:グループ B:投稿テキスト C:タイプ D:予約日 E:時 F:分 G:文字数
// H:ステータス I:投稿ID J:投稿日時 K:投稿URL L:メモ M:エラー

var COL = {
  GROUP:      1,   // A: グループ
  TEXT:       2,   // B: 投稿テキスト
  TYPE:       3,   // C: タイプ (NEW)
  DATE:       4,   // D: 予約日
  HOUR:       5,   // E: 時
  MINUTE:     6,   // F: 分
  CHAR_COUNT: 7,   // G: 文字数
  STATUS:     8,   // H: ステータス
  POST_ID:    9,   // I: 投稿ID
  DONE_AT:   10,   // J: 投稿日時
  POST_URL:  11,   // K: 投稿URL
  MEMO:      12,   // L: メモ
  ERROR:     13,   // M: エラー
};
var TOTAL_COLS = 13;
var API_BASE_ = 'https://graph.threads.net/v1.0/';

// ============================================
// セキュリティ & 設定
// ============================================

/** 実行内キャッシュ（PropertiesService呼び出し最小化） */
var _cfgCache = null;

function getConfig_() {
  if (_cfgCache) return _cfgCache;
  var props = PropertiesService.getScriptProperties();
  _cfgCache = {
    token: props.getProperty('THREADS_ACCESS_TOKEN') || '',
    userId: props.getProperty('THREADS_USER_ID') || '',
  };
  return _cfgCache;
}

function isConfigured_() {
  var c = getConfig_();
  return c.token !== '' && c.userId !== '';
}

/** エラーメッセージからトークンらしき文字列をマスク */
function maskToken_(str) {
  return String(str).replace(/[A-Za-z0-9_-]{20,}/g, '***');
}

/** HTML特殊文字エスケープ（XSS防止） */
function escapeHtml_(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================
// API ヘルパー（トークンは常にAuthorizationヘッダー）
// ============================================

/**
 * GET リクエスト
 * - トークンはAuthorizationヘッダー優先
 * - カンマ等の特殊文字はエンコードしない（Graph API互換）
 */
function apiGet_(path, params) {
  var c = getConfig_();
  if (!c.token) throw new Error('トークン未設定');
  var url = API_BASE_ + path;
  if (params) {
    var qs = Object.keys(params).map(function(k) {
      return k + '=' + params[k];
    }).join('&');
    url += '?' + qs;
  }
  // Bearer優先、フォールバック用にURLパラメータも付与
  url += (url.indexOf('?') === -1 ? '?' : '&') + 'access_token=' + c.token;
  var resp = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + c.token },
    muteHttpExceptions: true,
  });
  return parseApiResponse_(resp);
}

/**
 * POST リクエスト
 * - トークンはAuthorizationヘッダー + payloadフォールバック
 */
function apiPost_(path, payload) {
  var c = getConfig_();
  if (!c.token) throw new Error('トークン未設定');
  payload = payload || {};
  payload.access_token = c.token; // フォールバック
  var resp = UrlFetchApp.fetch(API_BASE_ + path, {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + c.token },
    payload: payload,
    muteHttpExceptions: true,
  });
  return parseApiResponse_(resp);
}

/** レスポンス解析（エラー時はトークンマスク済み） */
function parseApiResponse_(resp) {
  var code = resp.getResponseCode();
  var body;
  try {
    body = JSON.parse(resp.getContentText());
  } catch (e) {
    throw new Error('APIレスポンス解析失敗 (HTTP ' + code + ')');
  }
  if (code !== 200) {
    var msg = 'HTTP ' + code;
    if (body.error) {
      msg += ': ' + (body.error.message || '不明');
      if (body.error.type) msg += ' [' + body.error.type + ']';
      if (body.error.code) msg += ' (code:' + body.error.code + ')';
    }
    throw new Error(maskToken_(msg));
  }
  return body;
}

// ============================================
// メニュー
// ============================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('自動投稿')
    .addItem('全件承認', 'approveAllDrafts')
    .addSeparator()
    .addItem('トリガー ON（1分間隔）', 'setupTrigger')
    .addItem('トリガー OFF', 'removeTrigger')
    .addSeparator()
    .addItem('テキスト整形', 'formatUnpostedTexts')
    .addItem('日付リスケ', 'showRescheduleDialog')
    .addSeparator()
    .addItem('接続テスト', 'testConnection')
    .addItem('テスト投稿', 'testScheduledPost')
    .addItem('書式リセット', 'refreshSheet')
    .addItem('API設定', 'showSettingsDialog')
    .addToUi();

  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('投稿管理')) {
    showWelcome();
  }
}

/** ポスト文が編集されたら文字数を自動更新、グループ番号変更時にタイプを自動設定 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== '投稿管理') return;

  var col = e.range.getColumn();
  var row = e.range.getRow();
  if (row <= 1) return;

  if (col === COL.TEXT) {
    var text = e.range.getValue();
    sheet.getRange(row, COL.CHAR_COUNT).setValue(text ? String(text).length : 0);
  }

  // グループ番号が変更されたらタイプを自動設定
  if (col === COL.GROUP) {
    updateTypeColumn_(sheet, row);
  }

  // タイプ列: 英語値を日本語に自動変換
  if (col === COL.TYPE) {
    var typeVal = String(e.range.getValue()).toUpperCase();
    var typeMap = { 'NEW': '単体', 'REPLY': 'スレッド', 'SINGLE': '単体', 'THREAD': 'スレッド' };
    if (typeMap[typeVal]) e.range.setValue(typeMap[typeVal]);
  }

  // ステータス列: 英語値を日本語に自動変換
  if (col === COL.STATUS) {
    var statusVal = String(e.range.getValue()).toLowerCase();
    var statusMap = { 'pending': '待機中', 'published': '投稿済', 'error': 'エラー', 'draft': '下書き' };
    if (statusMap[statusVal]) e.range.setValue(statusMap[statusVal]);
  }
}

/** グループ番号に基づいてタイプ列を自動設定 */
function updateTypeColumn_(sheet, editedRow) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var groupVal = sheet.getRange(editedRow, COL.GROUP).getValue();
  if (!groupVal && groupVal !== 0) {
    sheet.getRange(editedRow, COL.TYPE).setValue('');
    return;
  }

  // 同じグループ番号が他の行にもあるか確認
  var allGroups = sheet.getRange(2, COL.GROUP, lastRow - 1, 1).getValues();
  var count = 0;
  for (var i = 0; i < allGroups.length; i++) {
    if (allGroups[i][0] == groupVal) count++;
  }

  var type = count > 1 ? 'スレッド' : '単体';
  sheet.getRange(editedRow, COL.TYPE).setValue(type);

  // 同じグループ番号の他の行もスレッドに更新
  if (count > 1) {
    for (var j = 0; j < allGroups.length; j++) {
      if (allGroups[j][0] == groupVal) {
        sheet.getRange(j + 2, COL.TYPE).setValue('スレッド');
      }
    }
  }
}

// ============================================
// ウェルカム
// ============================================

function showWelcome() {
  var html = HtmlService.createHtmlOutput(
    '<style>' +
    '  body{font-family:-apple-system,sans-serif;padding:28px 32px;text-align:center;color:#1a1a1a;background:#fafafa}' +
    '  h2{margin:0 0 4px;font-size:22px;font-weight:700;letter-spacing:-0.3px}' +
    '  .sub{color:#666;font-size:13px;margin-bottom:28px}' +
    '  .steps{text-align:left;max-width:340px;margin:0 auto 28px}' +
    '  .step{display:flex;align-items:flex-start;gap:14px;margin-bottom:16px}' +
    '  .num{background:#4FC3F7;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}' +
    '  .txt{font-size:14px;line-height:1.6;padding-top:2px;color:#333}' +
    '  .btn{padding:13px 36px;background:#4FC3F7;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}' +
    '  .btn:hover{background:#039BE5}' +
    '</style>' +
    '<h2>Auto Post</h2>' +
    '<p class="sub">予約投稿 / スレッド投稿 / 自動管理</p>' +
    '<div class="steps">' +
    '  <div class="step"><div class="num">1</div><div class="txt">下の「初期設定を開始」をクリック</div></div>' +
    '  <div class="step"><div class="num">2</div><div class="txt">Threads API の User ID と Access Token を入力</div></div>' +
    '  <div class="step"><div class="num">3</div><div class="txt">投稿を入力して自動投稿スタート</div></div>' +
    '</div>' +
    '<button class="btn" onclick="google.script.run.withSuccessHandler(function(){google.script.host.close()}).showSettingsDialog()">初期設定を開始</button>'
  ).setWidth(440).setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'Auto Post');
}

// ============================================
// シート初期化
// ============================================

function initSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  initPostSheet(ss);

  // 不要なシートを削除
  var toDelete = ['シート1', 'Sheet1', 'インサイト'];
  toDelete.forEach(function(name) {
    var s = ss.getSheetByName(name);
    if (s && ss.getSheets().length > 1) {
      try { ss.deleteSheet(s); } catch(e) {}
    }
  });

  // トークン自動更新トリガーをセット（トリガーON/OFFに関係なく常に有効）
  setupTokenRefreshTrigger_();

  ss.setActiveSheet(ss.getSheetByName('投稿管理'));
}

function initPostSheet(ss) {
  var sheet = ss.getSheetByName('投稿管理');
  if (!sheet) sheet = ss.insertSheet('投稿管理');

  applyPostSheetFormat_(sheet, 300);

  // 空のシートで開始

  sheet.setTabColor('#29B6F6');
}

// ============================================
// シート書式共通（init と refresh で再利用）
// ============================================

function applyPostSheetFormat_(sheet, R) {
  // --- ヘッダー（テーブル風チップデザイン） ---
  var headers = [
    'No.', '投稿テキスト', 'タイプ', '予約日',
    '時', '分', '文字数',
    'ステータス', '', '投稿日時', '投稿URL', 'メモ', 'エラー'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ヘッダー行: 水色背景＋白文字＋丸ゴシック
  var hr = sheet.getRange(1, 1, 1, headers.length);
  hr.setBackground('#4FC3F7');
  hr.setFontColor('#ffffff');
  hr.setFontWeight('bold');
  hr.setFontSize(10);
  hr.setFontFamily('Arial');
  hr.setHorizontalAlignment('center');
  hr.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 36);

  // ヘッダーの上下左右に薄い白ボーダー（チップ区切り風）
  hr.setBorder(true, true, true, true, true, true, '#81D4FA', SpreadsheetApp.BorderStyle.SOLID);

  // --- 全体のデフォルト ---
  var dataRange = sheet.getRange(2, 1, R, TOTAL_COLS);
  dataRange.setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');
  dataRange.setBackground('#ffffff');

  // --- 列幅 ---
  sheet.setColumnWidth(COL.GROUP, 48);
  sheet.setColumnWidth(COL.TEXT, 520);
  sheet.setColumnWidth(COL.TYPE, 65);
  sheet.setColumnWidth(COL.DATE, 95);
  sheet.setColumnWidth(COL.HOUR, 36);
  sheet.setColumnWidth(COL.MINUTE, 36);
  sheet.setColumnWidth(COL.CHAR_COUNT, 48);
  sheet.setColumnWidth(COL.STATUS, 78);
  sheet.setColumnWidth(COL.POST_ID, 10);   // 非表示レベルに狭く
  sheet.setColumnWidth(COL.DONE_AT, 120);
  sheet.setColumnWidth(COL.POST_URL, 220);
  sheet.setColumnWidth(COL.MEMO, 140);
  sheet.setColumnWidth(COL.ERROR, 180);

  // 投稿ID列を非表示
  sheet.hideColumns(COL.POST_ID);

  // --- No.列 ---
  var groupRange = sheet.getRange(2, COL.GROUP, R, 1);
  groupRange.setHorizontalAlignment('center');
  groupRange.setFontWeight('bold');
  groupRange.setFontSize(11);
  groupRange.setFontColor('#4FC3F7');

  // --- 投稿テキスト ---
  var textRange = sheet.getRange(2, COL.TEXT, R, 1);
  textRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  textRange.setVerticalAlignment('top');
  textRange.setFontSize(10);
  textRange.setFontColor('#222222');

  // --- タイプ列（チップ風） ---
  sheet.getRange(2, COL.TYPE, R, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(['単体', 'スレッド']).setAllowInvalid(false).build())
    .setHorizontalAlignment('center').setFontSize(9).setFontColor('#555555');

  // --- 予約日 ---
  sheet.getRange(2, COL.DATE, R, 1).setNumberFormat('yyyy/mm/dd');
  sheet.getRange(2, COL.DATE, R, 1).setHorizontalAlignment('center');
  sheet.getRange(2, COL.DATE, R, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build()
  );

  // --- 時 ドロップダウン ---
  var hours = [];
  for (var h = 0; h <= 23; h++) hours.push(String(h));
  sheet.getRange(2, COL.HOUR, R, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(hours).setAllowInvalid(false).build()
  ).setHorizontalAlignment('center').setFontSize(9);

  // --- 分 ドロップダウン ---
  var mins = [];
  for (var m = 0; m < 60; m++) mins.push(String(m));
  sheet.getRange(2, COL.MINUTE, R, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(mins).setAllowInvalid(false).build()
  ).setHorizontalAlignment('center').setFontSize(9);

  // --- 文字数 ---
  sheet.getRange(2, COL.CHAR_COUNT, R, 1)
    .setHorizontalAlignment('center').setFontColor('#aaaaaa').setFontSize(9);

  // --- ステータス（チップ風に丸みのあるデザインは条件付き書式で表現） ---
  sheet.getRange(2, COL.STATUS, R, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(['下書き', '待機中', '投稿済', 'エラー']).setAllowInvalid(false).build())
    .setHorizontalAlignment('center').setFontWeight('bold').setFontSize(9);

  // --- ステータスのデフォルト（データがある行のみ） ---
  var lastDataRow = sheet.getLastRow();
  if (lastDataRow >= 2) {
    var dataRows = lastDataRow - 1;
    var statusValues = sheet.getRange(2, COL.STATUS, dataRows, 1).getValues();
    var textValues = sheet.getRange(2, COL.TEXT, dataRows, 1).getValues();
    for (var si = 0; si < statusValues.length; si++) {
      if (textValues[si][0] && !statusValues[si][0]) statusValues[si][0] = '下書き';
    }
    sheet.getRange(2, COL.STATUS, dataRows, 1).setValues(statusValues);
  }

  // --- 結果列 ---
  sheet.getRange(2, COL.POST_ID, R, 1).setNumberFormat('@').setFontColor('#ffffff').setFontSize(8);
  sheet.getRange(2, COL.DONE_AT, R, 1).setNumberFormat('yyyy/mm/dd hh:mm').setFontColor('#888888').setFontSize(9).setHorizontalAlignment('center');
  sheet.getRange(2, COL.POST_URL, R, 1).setFontColor('#4FC3F7').setFontSize(9);
  sheet.getRange(2, COL.ERROR, R, 1).setFontColor('#ef5350').setFontSize(9);

  // --- メモ列 ---
  sheet.getRange(2, COL.MEMO, R, 1)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setFontSize(9).setFontColor('#777777');

  // --- 条件付き書式 ---
  var charRange = [sheet.getRange(2, COL.CHAR_COUNT, R, 1)];
  var statusRange = [sheet.getRange(2, COL.STATUS, R, 1)];
  var rowRange = [sheet.getRange(2, 1, R, TOTAL_COLS)];
  var typeRange = [sheet.getRange(2, COL.TYPE, R, 1)];

  var rules = [];

  // 文字数オーバー
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(500).setBackground('#fff0f0').setFontColor('#e53935')
    .setRanges(charRange).build());

  // ステータス: 投稿済（ミントグリーン）
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('投稿済').setBackground('#e0f7fa').setFontColor('#00838f')
    .setRanges(statusRange).build());
  // ステータス: 下書き（黄色 — 未承認）
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('下書き').setBackground('#fff9c4').setFontColor('#f9a825')
    .setRanges(statusRange).build());
  // ステータス: 待機中（ソフトブルー — 承認済み・投稿待ち）
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('待機中').setBackground('#e8f0fe').setFontColor('#1967d2')
    .setRanges(statusRange).build());
  // ステータス: エラー
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('エラー').setBackground('#fce8e6').setFontColor('#d93025')
    .setRanges(statusRange).build());

  // タイプ: スレッド（薄紫チップ風）
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('スレッド').setBackground('#f3e8fd').setFontColor('#7b1fa2')
    .setRanges(typeRange).build());
  // タイプ: 単体（薄グレー）
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('単体').setBackground('#f1f3f4').setFontColor('#5f6368')
    .setRanges(typeRange).build());

  // 投稿済行をグレーアウト
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$H2="投稿済"')
    .setBackground('#f8f9fa').setFontColor('#dadce0')
    .setRanges(rowRange).build());

  sheet.setConditionalFormatRules(rules);

  // --- 罫線 ---
  // 全セルの罫線をリセット
  sheet.getRange(1, 1, R + 1, TOTAL_COLS).setBorder(false, false, false, false, false, false);
  // データ行に薄いグリッド線（テーブル感を出す）
  sheet.getRange(2, 1, R, TOTAL_COLS).setBorder(null, null, null, null, null, true, '#e8eaed', SpreadsheetApp.BorderStyle.SOLID);
  // ヘッダー下線
  sheet.getRange(1, 1, 1, TOTAL_COLS).setBorder(null, null, true, null, null, null, '#29B6F6', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sheet.setFrozenRows(1);
}

// ============================================
// Threads API
// ============================================

function testConnection() {
  var ui = SpreadsheetApp.getUi();
  var config = getConfig_();
  if (!config.token) {
    ui.alert('Access Token が未設定です。\n「自動投稿」>「API設定」から設定してください。');
    return;
  }

  var results = [];
  try {
    var body = apiGet_('me', { fields: 'id,username' });
    results.push('プロフィール取得: OK');
    results.push('User ID: ' + body.id);
    results.push('ユーザー名: @' + (body.username || '不明'));

    if (config.userId && config.userId !== body.id) {
      var fix = ui.alert('User ID 不一致',
        '設定中: ' + config.userId + '\n正しい: ' + body.id + '\n\n自動修正しますか？',
        ui.ButtonSet.YES_NO);
      if (fix === ui.Button.YES) {
        PropertiesService.getScriptProperties().setProperty('THREADS_USER_ID', body.id);
        _cfgCache = null; // キャッシュクリア
        results.push('→ 修正しました');
      }
    } else {
      results.push('User ID: OK');
    }
  } catch (e) {
    results.push('エラー: ' + e.message);
    results.push('原因: トークン期限切れ or テスター未承認');
  }
  ui.alert('接続テスト', results.join('\n'), ui.ButtonSet.OK);
}

/**
 * Threadsに投稿（Bearer認証）
 * @param {string} text
 * @param {string} imageUrl
 * @param {string} replyToId - スレッド投稿時の親投稿ID
 * @return {object} { id: 公開ポストID, containerId: コンテナID }
 */
function postToThreads_(text, imageUrl, replyToId) {
  var c = getConfig_();
  if (!c.token || !c.userId) {
    throw new Error('API未設定。「自動投稿」>「API設定」から設定してください。');
  }

  var payload = {
    media_type: imageUrl ? 'IMAGE' : 'TEXT',
    text: text,
  };
  if (imageUrl) payload.image_url = imageUrl;
  if (replyToId) payload.reply_to_id = replyToId;

  // Step1: コンテナ作成
  var created = apiPost_(c.userId + '/threads', payload);

  if (imageUrl) Utilities.sleep(3000);

  // Step2: 公開
  var published = apiPost_(c.userId + '/threads_publish', { creation_id: created.id });

  return {
    id: published.id,               // 公開ポストID（reply_to_id に使う）
    containerId: created.id,        // コンテナID（ステータス確認に使う）
  };
}

/**
 * コンテナIDのステータスが PUBLISHED になるまで待機
 * ※失敗してもフォールバックスリープで続行（中断しない）
 * @param {string} containerId - threads_publish ではなく threads で返った ID
 */
function waitForReady_(containerId) {
  var maxWait = 30000;
  var interval = 3000;
  var elapsed = 0;
  var confirmed = false;

  while (elapsed < maxWait) {
    Utilities.sleep(interval);
    elapsed += interval;
    try {
      var data = apiGet_(String(containerId), { fields: 'status' });
      if (data.status === 'PUBLISHED') {
        console.log('公開確認OK (ID: ' + containerId + ', ' + elapsed + 'ms)');
        confirmed = true;
        break;
      }
      if (data.status === 'ERROR' || data.status === 'EXPIRED') {
        console.log('ステータス異常: ' + data.status);
        break;
      }
      // IN_PROGRESS → 待ち続ける
    } catch (e) {
      console.log('ステータス確認エラー: ' + e.message);
      break;
    }
  }

  // PUBLISHED確認できてもAPI伝播に時間がかかる場合があるため
  // reply_to_id として使えるまでの追加バッファを入れる
  var buffer = confirmed ? 5000 : 10000;
  console.log((confirmed ? '伝播バッファ' : 'フォールバック') + ': ' + (buffer / 1000) + '秒待機');
  Utilities.sleep(buffer);
}

/**
 * リトライ付き投稿（一時的なAPI障害に対応）
 * "The requested resource does not exist" 等のエラーを最大3回リトライ
 * @param {string} text
 * @param {string} imageUrl
 * @param {string} replyToId
 * @return {object} { id, containerId }
 */
function postWithRetry_(text, imageUrl, replyToId) {
  var MAX_RETRIES = 3;
  var lastErr;

  for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return postToThreads_(text, imageUrl, replyToId);
    } catch (e) {
      lastErr = e;
      console.log('投稿リトライ ' + attempt + '/' + MAX_RETRIES + ': ' + e.message);

      if (attempt < MAX_RETRIES) {
        // 指数バックオフ: 5秒, 10秒, (15秒)
        var wait = attempt * 5000;
        console.log(wait / 1000 + '秒待機後にリトライ...');
        Utilities.sleep(wait);
      }
    }
  }
  // 全リトライ失敗 → エラーメッセージにリトライ回数を付記
  throw new Error(lastErr.message + '（' + MAX_RETRIES + '回リトライ失敗）');
}

/** 投稿IDからpermalinkを取得 */
function getPostPermalink_(postId) {
  try {
    var data = apiGet_(postId, { fields: 'permalink' });
    return data.permalink || '';
  } catch (e) {
    console.log('permalink取得エラー: ' + e.message);
    return '';
  }
}

// ============================================
// 投稿処理
// ============================================

/** 行データを読み取る */
function readRow_(sheet, row) {
  var vals = sheet.getRange(row, 1, 1, TOTAL_COLS).getValues()[0];
  return {
    group:    vals[COL.GROUP - 1],
    text:     vals[COL.TEXT - 1],
    type:     vals[COL.TYPE - 1],
    date:     vals[COL.DATE - 1],
    hour:     vals[COL.HOUR - 1],
    minute:   vals[COL.MINUTE - 1],
    status:   vals[COL.STATUS - 1],
    postId:   vals[COL.POST_ID - 1],
  };
}

/** 選択行を単体投稿 */
function postSelectedRow() {
  var ui = SpreadsheetApp.getUi();
  var sheet = getPostSheet_(); if (!sheet) return;
  if (!checkConfig_(ui)) return;

  var row = SpreadsheetApp.getActiveRange().getRow();
  if (row <= 1) { ui.alert('2行目以降を選択してください。'); return; }

  var d = readRow_(sheet, row);
  if (!d.text) { ui.alert('ポスト文が空です。'); return; }
  if (d.status === '投稿済') { ui.alert('既に投稿済みです。'); return; }

  var preview = String(d.text).length > 60 ? String(d.text).substring(0, 60) + '...' : d.text;
  if (ui.alert('投稿確認', preview, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  try {
    var result = postToThreads_(d.text, '', null);
    writeSuccess_(sheet, row, result.id);
    ui.alert('投稿完了！');
  } catch (e) {
    writeError_(sheet, row, e.message);
    ui.alert('投稿失敗:\n' + e.message);
  }
}

/** 選択スレッドをまとめて投稿 */
function postSelectedThread() {
  var ui = SpreadsheetApp.getUi();
  var sheet = getPostSheet_(); if (!sheet) return;
  if (!checkConfig_(ui)) return;

  var row = SpreadsheetApp.getActiveRange().getRow();
  if (row <= 1) { ui.alert('スレッドの行を選択してください。'); return; }

  var groupNo = sheet.getRange(row, COL.GROUP).getValue();
  if (!groupNo && groupNo !== 0) {
    ui.alert('選択行にグループ番号がありません。\n単体投稿は「選択行を投稿」を使ってください。');
    return;
  }

  // 選択行の日付を取得（グループ番号＋日付でグルーピング）
  var groupDate = sheet.getRange(row, COL.DATE).getValue();

  // 同じグループNo＋同じ日付の行を収集
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  var allData = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();
  var threadRows = [];

  for (var i = 0; i < allData.length; i++) {
    if (allData[i][COL.GROUP - 1] == groupNo && isSameDate_(allData[i][COL.DATE - 1], groupDate)) {
      threadRows.push({
        idx: i,
        row: i + 2,
        text: allData[i][COL.TEXT - 1],
        status: allData[i][COL.STATUS - 1],
        postId: allData[i][COL.POST_ID - 1],
      });
    }
  }

  var pending = threadRows.filter(function(r) { return r.status !== '投稿済'; });
  if (pending.length === 0) { ui.alert('グループ ' + groupNo + ' は全て投稿済みです。'); return; }

  // 確認
  var msg = 'グループ ' + groupNo + '（' + threadRows.length + '件）を投稿しますか？\n\n';
  threadRows.forEach(function(r, i) {
    var mark = r.status === '投稿済' ? '✓' : '○';
    var txt = String(r.text).length > 35 ? String(r.text).substring(0, 35) + '...' : r.text;
    msg += mark + ' ' + (i + 1) + '. ' + txt + '\n';
  });
  if (ui.alert('スレッド投稿確認', msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  // 実行: 各投稿は前の投稿への返信としてチェーンする
  var prevPostId = null;
  var okCount = 0, ngCount = 0;
  for (var j = 0; j < threadRows.length; j++) {
    var tr = threadRows[j];

    if (tr.status === '投稿済') {
      if (tr.postId) prevPostId = String(tr.postId);
      okCount++;
      continue;
    }
    if (!tr.text) { writeError_(sheet, tr.row, 'テキスト空'); ngCount++; continue; }

    try {
      var replyTo = prevPostId ? String(prevPostId) : null;
      var result = postWithRetry_(tr.text, '', replyTo);
      writeSuccess_(sheet, tr.row, result.id);

      // 次の投稿はこの投稿への返信にする（チェーン）
      prevPostId = String(result.id);
      okCount++;

      // 次の投稿がある場合、公開完了を待ってから進む
      if (j < threadRows.length - 1) {
        waitForReady_(result.containerId);
      }
    } catch (e) {
      writeError_(sheet, tr.row, e.message);
      ngCount++;
      // スレッドのチェーンが切れるため残りは中断
      ui.alert('スレッド投稿中にエラー（リトライ後も失敗）:\n' + e.message + '\n\n残り ' + (threadRows.length - j - 1) + ' 件は中断しました。');
      return;
    }
  }

  var summary = 'グループ ' + groupNo + ' の投稿が完了しました！\n' + okCount + '件成功';
  if (ngCount > 0) summary += '、' + ngCount + '件エラー';
  ui.alert(summary);
}

/** 予約投稿（トリガーから自動実行） */
function processScheduledPosts() {
  var sheet = getPostSheet_();
  if (!sheet || !isConfigured_()) return;

  // タイムゾーン安全チェック: Asia/Tokyo以外なら投稿しない
  var tz = Session.getScriptTimeZone();
  if (tz !== 'Asia/Tokyo') {
    console.error('タイムゾーンエラー: ' + tz + '（Asia/Tokyoが必要です）。投稿を中止しました。GASエディタ > プロジェクトの設定 でタイムゾーンを Asia/Tokyo に変更してください。');
    return;
  }

  var now = new Date();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var allData = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();

  // 分類
  var singles = [];
  var threads = {};

  for (var i = 0; i < allData.length; i++) {
    var status = allData[i][COL.STATUS - 1];
    var text = allData[i][COL.TEXT - 1];
    var date = allData[i][COL.DATE - 1];
    if (status !== '待機中' || !text || !date) continue;

    var h = parseInt(allData[i][COL.HOUR - 1], 10) || 0;
    var m = parseInt(allData[i][COL.MINUTE - 1], 10) || 0;
    var scheduled = new Date(date);
    scheduled.setHours(h, m, 0, 0);
    if (scheduled > now) continue;
    // 5分以上前の予約は無視（列ずれ等で過去日付が大量投稿されるのを防止）
    var delayMs = now.getTime() - scheduled.getTime();
    if (delayMs > 5 * 60 * 1000) {
      console.log('スキップ(5分超過): 行' + (i + 2) + ' 予約=' + Utilities.formatDate(scheduled, 'Asia/Tokyo', 'MM/dd HH:mm') + ' 遅延=' + Math.round(delayMs / 60000) + '分');
      continue;
    }

    var groupNo = allData[i][COL.GROUP - 1];
    var entry = {
      row: i + 2,
      text: text,
      groupNo: groupNo,
      date: date,
    };

    if (!groupNo && groupNo !== 0) {
      singles.push(entry);
    } else {
      // グループ番号＋日付でグルーピング（日付違いは別スレッド）
      var key = groupNo + '_' + dateKey_(date);
      if (!threads[key]) threads[key] = [];
      threads[key].push(entry);
    }
  }

  var ok = 0, ng = 0;

  // 単体（リトライ付き）
  singles.forEach(function(s) {
    try {
      var r = postWithRetry_(s.text, '', null);
      writeSuccess_(sheet, s.row, r.id);
      ok++; Utilities.sleep(2000);
    } catch (e) { writeError_(sheet, s.row, e.message); ng++; }
  });

  // スレッド（リトライ付き）
  Object.keys(threads).forEach(function(key) {
    var group = threads[key];
    var prevId = null;
    var gNo = group[0].groupNo;
    var gDate = group[0].date;

    // 同じグループNo＋同じ日付の既投稿から最後の投稿IDを探す（チェーンの続き）
    for (var k = 0; k < allData.length; k++) {
      if (allData[k][COL.GROUP - 1] == gNo && isSameDate_(allData[k][COL.DATE - 1], gDate) && allData[k][COL.STATUS - 1] === '投稿済' && allData[k][COL.POST_ID - 1]) {
        prevId = String(allData[k][COL.POST_ID - 1]);
      }
    }

    for (var gi = 0; gi < group.length; gi++) {
      var g = group[gi];
      try {
        var reply = prevId ? String(prevId) : null;
        var r = postWithRetry_(g.text, '', reply);
        writeSuccess_(sheet, g.row, r.id);
        prevId = String(r.id);
        ok++;
        // 次の投稿がある場合、公開完了を待ってから進む
        if (gi < group.length - 1) {
          waitForReady_(r.containerId);
        }
      } catch (e) { writeError_(sheet, g.row, e.message); ng++; break; }
    }
  });

  if (ok > 0 || ng > 0) console.log('予約投稿: ' + ok + '件成功, ' + ng + '件エラー');
}

// ============================================
// シート更新（データを残して書式を再適用）
// ============================================

function refreshSheet() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('投稿管理');
  if (!sheet) {
    // 「投稿管理」シートがなければ自動作成（初回セットアップ漏れ対応）
    sheet = ss.getActiveSheet();
    sheet.setName('投稿管理');
  }

  var lastRow = Math.max(sheet.getLastRow(), 2);
  var R = Math.max(lastRow + 100, 300);

  // 共通書式を適用
  applyPostSheetFormat_(sheet, R);
  sheet.setTabColor('#4FC3F7');

  // --- 既存データの文字数を再計算 ---
  if (lastRow > 1) {
    var texts = sheet.getRange(2, COL.TEXT, lastRow - 1, 1).getValues();
    var counts = texts.map(function(r) { return [r[0] ? String(r[0]).length : '']; });
    sheet.getRange(2, COL.CHAR_COUNT, lastRow - 1, 1).setValues(counts);
  }

  ui.alert('書式リセット完了！\n書式・ドロップダウン・条件付き書式を再適用しました。\nデータはそのままです。');
}

// ============================================
// ヘルパー
// ============================================

/** 日付部分（年月日）が同じか比較。両方空なら一致扱い */
function isSameDate_(d1, d2) {
  if (!d1 && !d2) return true;
  if (!d1 || !d2) return false;
  var a = d1 instanceof Date ? d1 : new Date(d1);
  var b = d2 instanceof Date ? d2 : new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/** 日付からグルーピング用キー文字列を生成 */
function dateKey_(d) {
  if (!d) return '_nodate';
  var dt = d instanceof Date ? d : new Date(d);
  return dt.getFullYear() + '/' + (dt.getMonth() + 1) + '/' + dt.getDate();
}

function getPostSheet_() {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('投稿管理');
  if (!s) SpreadsheetApp.getUi().alert('「投稿管理」シートがありません。初期設定を実行してください。');
  return s;
}

function checkConfig_(ui) {
  if (!isConfigured_()) { ui.alert('API未設定。「自動投稿」>「API設定」から設定してください。'); return false; }
  return true;
}

/** 投稿成功をバッチ書き込み */
function writeSuccess_(sheet, row, postId) {
  var permalink = getPostPermalink_(postId);
  // postIdセルをテキスト形式にしてから書き込み（数値化による精度劣化を防止）
  sheet.getRange(row, COL.POST_ID).setNumberFormat('@');
  // STATUS(H), POST_ID(I), DONE_AT(J), POST_URL(K) の4列を一括書き込み
  sheet.getRange(row, COL.STATUS, 1, 4).setValues([
    ['投稿済', String(postId), new Date(), permalink || '']
  ]);
}

function writeError_(sheet, row, msg) {
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd HH:mm');
  sheet.getRange(row, COL.STATUS).setValue('エラー');
  sheet.getRange(row, COL.ERROR).setValue('[' + now + '] ' + maskToken_(msg));
}

// ============================================
// 未投稿テキスト整形（AI感除去＋段落改行追加）
// ============================================

function formatUnpostedTexts() {
  var sheet = getPostSheet_();
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var count = 0;
  for (var i = 2; i <= lastRow; i++) {
    var status = sheet.getRange(i, COL.STATUS).getValue();
    if (status === '投稿済') continue;

    var text = sheet.getRange(i, COL.TEXT).getValue();
    if (!text || String(text).trim() === '') continue;

    var original = String(text);
    var formatted = cleanAndFormat_(original);

    if (formatted !== original) {
      sheet.getRange(i, COL.TEXT).setValue(formatted);
      count++;
    }
  }

  SpreadsheetApp.getUi().alert('整形完了: ' + count + '件のテキストを修正しました。');
}

function cleanAndFormat_(text) {
  // === Step 0: 構造マーカーの除去 ===
  text = text.replace(/■(?:CTA|\d+)\s*/g, '');

  // === Step 1: AI感のある記号を除去 ===
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/["\u201C]\u201C(.+?)["\u201D]\u201D/g, '「$1」');
  text = text.replace(/""(.+?)""/g, '「$1」');
  text = text.replace(/\u201C(.+?)\u201D/g, '「$1」');
  text = text.replace(/^【(.+?)】\n?/gm, '$1\n');
  text = text.replace(/^[※＊]\s*/gm, '');

  // === Step 2: 番号付き箇条書きを改行する ===
  text = text.replace(/([^\n])([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/g, '$1\n$2');
  text = text.replace(/([^\n])(・)/g, '$1\n$2');

  // === Step 3: 箇条書きブロック前後に空行 ===
  var lines = text.split('\n');
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var isListItem = /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳・]/.test(line);
    var prevIsListItem = i > 0 && /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳・]/.test(lines[i - 1]);
    if (isListItem && !prevIsListItem && i > 0 && lines[i - 1].trim() !== '') {
      result.push('');
    }
    result.push(line);
    var nextIsListItem = i < lines.length - 1 && /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳・]/.test(lines[i + 1]);
    if (isListItem && !nextIsListItem && i < lines.length - 1) {
      result.push('');
    }
  }
  text = result.join('\n');

  // === Step 4: 段落改行を追加 ===
  if (text.indexOf('\n\n') !== -1) {
    return text.trim();
  }
  if (text.indexOf('\n') === -1) {
    text = addParagraphBreaks_(text);
  }
  return text.trim();
}

function addParagraphBreaks_(text) {
  var sentences = text.split('\u3002'); // 。
  if (sentences.length <= 1) return text;
  if (sentences[sentences.length - 1].trim() === '') sentences.pop();

  var paragraphs = [];
  var current = [];
  var sentencesInParagraph = 0;
  var isFirstParagraph = true;
  var targetSize = 1;

  for (var i = 0; i < sentences.length; i++) {
    var s = sentences[i].trim();
    if (s === '') continue;
    current.push(s + '\u3002');
    sentencesInParagraph++;

    var shouldBreak = false;
    if (isFirstParagraph && sentencesInParagraph >= targetSize) {
      shouldBreak = true;
      isFirstParagraph = false;
      targetSize = 3;
    } else if (!isFirstParagraph && sentencesInParagraph >= targetSize) {
      shouldBreak = true;
      targetSize = (targetSize === 3) ? 2 : 3;
    }

    var remaining = sentences.length - i - 1;
    if (shouldBreak && remaining <= 1 && sentencesInParagraph < 4) {
      shouldBreak = false;
    }

    if (shouldBreak || i === sentences.length - 1) {
      paragraphs.push(current.join(''));
      current = [];
      sentencesInParagraph = 0;
    }
  }
  return paragraphs.join('\n\n');
}

// ============================================
// 承認（下書き → 待機中）
// ============================================

/** 選択した行の「下書き」を「待機中」に変更 */
function approveSelectedRows() {
  var ui = SpreadsheetApp.getUi();
  var sheet = getPostSheet_();
  if (!sheet) return;

  var selection = sheet.getActiveRange();
  if (!selection) { ui.alert('承認したい行を選択してください。'); return; }

  var startRow = selection.getRow();
  var numRows = selection.getNumRows();
  var count = 0;

  for (var i = 0; i < numRows; i++) {
    var row = startRow + i;
    if (row < 2) continue; // ヘッダー行スキップ
    var status = sheet.getRange(row, COL.STATUS).getValue();
    if (status === '下書き') {
      sheet.getRange(row, COL.STATUS).setValue('待機中');
      count++;
    }
  }

  if (count === 0) {
    ui.alert('選択範囲に「下書き」の行がありませんでした。');
  } else {
    ui.alert(count + '件を承認しました（下書き → 待機中）。\nトリガーONなら予約時刻に自動投稿されます。');
  }
}

/** 全ての「下書き」を「待機中」に一括変更 */
function approveAllDrafts() {
  var ui = SpreadsheetApp.getUi();
  var sheet = getPostSheet_();
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) { ui.alert('データがありません。'); return; }

  // 先にカウントして確認ダイアログ
  var statuses = sheet.getRange(2, COL.STATUS, lastRow - 1, 1).getValues();
  var draftCount = statuses.filter(function(r) { return r[0] === '下書き'; }).length;

  if (draftCount === 0) { ui.alert('「下書き」の投稿がありません。'); return; }

  var confirm = ui.alert('全件承認',
    '「下書き」' + draftCount + '件を全て「待機中」に変更します。\nよろしいですか？',
    ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  var count = 0;
  for (var i = 0; i < statuses.length; i++) {
    if (statuses[i][0] === '下書き') {
      statuses[i][0] = '待機中';
      count++;
    }
  }
  sheet.getRange(2, COL.STATUS, lastRow - 1, 1).setValues(statuses);

  ui.alert(count + '件を承認しました（下書き → 待機中）。\nトリガーONなら予約時刻に自動投稿されます。');
}

// ============================================
// テスト投稿
// ============================================

/**
 * アップデート後の動作確認用。
 * スプシにテスト行を1行追加（予約＝1分後）し、トリガーが正常に投稿するか確認する。
 * 投稿テキストは「テスト投稿（自動削除OK）」。
 * 結果はスプシのステータス列で確認できる。
 */
function testScheduledPost() {
  var ui = SpreadsheetApp.getUi();
  if (!isConfigured_()) { ui.alert('先にAPI設定を行ってください。'); return; }

  // タイムゾーンチェック
  var tz = Session.getScriptTimeZone();
  if (tz !== 'Asia/Tokyo') {
    ui.alert('タイムゾーンエラー\n\n現在: ' + tz + '\n必要: Asia/Tokyo\n\nGASエディタ > プロジェクトの設定 でタイムゾーンを変更してください。');
    return;
  }

  var sheet = getPostSheet_();
  if (!sheet) return;

  // 1分後の時刻を計算
  var now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  var testDate = new Date(now);
  testDate.setHours(0, 0, 0, 0);
  var h = now.getHours();
  var m = now.getMinutes();

  // テスト行を最終行に追加
  var lastRow = Math.max(sheet.getLastRow(), 1) + 1;
  var row = [];
  for (var c = 0; c < TOTAL_COLS; c++) row.push('');
  row[COL.TEXT - 1] = 'テスト投稿（自動削除OK）';
  row[COL.TYPE - 1] = '単体';
  row[COL.DATE - 1] = testDate;
  row[COL.HOUR - 1] = h;
  row[COL.MINUTE - 1] = m;
  row[COL.CHAR_COUNT - 1] = 14;
  row[COL.STATUS - 1] = '待機中';
  row[COL.MEMO - 1] = 'アップデート動作確認';
  sheet.getRange(lastRow, 1, 1, TOTAL_COLS).setValues([row]);

  // トリガーが動いているか確認、なければ一時的にセット
  var triggers = ScriptApp.getProjectTriggers();
  var hasTrigger = triggers.some(function(t) { return t.getHandlerFunction() === 'processScheduledPosts'; });
  if (!hasTrigger) {
    ScriptApp.newTrigger('processScheduledPosts').timeBased().everyMinutes(1).create();
  }

  ui.alert('テスト投稿を予約しました！\n\n'
    + '予約時刻: ' + h + '時' + m + '分（約1分後）\n'
    + '行番号: ' + lastRow + '\n\n'
    + '1〜2分後にスプレッドシートを確認して、\n'
    + 'ステータスが「投稿済」になっていればOKです。\n\n'
    + '投稿後、テスト投稿はThreadsから手動で削除してください。');
}

// ============================================
// トリガー
// ============================================

function setupTrigger() {
  if (!isConfigured_()) { SpreadsheetApp.getUi().alert('先にAPI設定を行ってください。'); return; }
  removeTrigger();
  ScriptApp.newTrigger('processScheduledPosts').timeBased().everyMinutes(1).create();
  // トークン自動更新トリガーも一緒にセット（7日おき）
  setupTokenRefreshTrigger_();
  SpreadsheetApp.getUi().alert('トリガー設定完了！\n1分間隔で自動チェックします。\nトークン自動更新も有効です（7日おき）。');
}

function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'processScheduledPosts' || fn === 'refreshAccessToken') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

// ============================================
// トークン自動更新（60日期限切れ防止）
// ============================================

/**
 * Threads長期トークンを更新する。
 * 長期トークンは60日で期限切れ。7日おきに自動更新して期限切れを防ぐ。
 * 手動実行も可能（メニューから or clasp run）。
 */
function refreshAccessToken() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('THREADS_ACCESS_TOKEN');
  if (!token) {
    console.log('トークン未設定のためスキップ');
    return;
  }

  var url = 'https://graph.threads.net/refresh_access_token'
    + '?grant_type=th_refresh_token'
    + '&access_token=' + token;

  try {
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var body = JSON.parse(resp.getContentText());

    if (body.access_token) {
      props.setProperty('THREADS_ACCESS_TOKEN', body.access_token);
      _cfgCache = null;
      console.log('トークン更新成功（有効期限: ' + body.expires_in + '秒）');
    } else {
      var errMsg = body.error ? body.error.message : '不明なエラー';
      console.error('トークン更新失敗: ' + maskToken_(errMsg));
    }
  } catch (e) {
    console.error('トークン更新エラー: ' + maskToken_(e.message));
  }
}

/** トークン更新トリガーをセット（7日おき） */
function setupTokenRefreshTrigger_() {
  // 既存の更新トリガーを削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'refreshAccessToken') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshAccessToken').timeBased().everyDays(7).create();
}

// ============================================
// 設定ダイアログ
// ============================================

function showSettingsDialog() {
  var config = getConfig_();
  var safeUserId = escapeHtml_(config.userId);
  var tokenPlaceholder = config.token ? '********（設定済み）' : '';

  var html = HtmlService.createHtmlOutput(
    '<style>' +
    '  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px 28px;color:#1a1a1a;background:#fafafa}' +
    '  h3{margin:0 0 4px;font-size:19px;font-weight:700;color:#000;letter-spacing:-0.3px}' +
    '  .sub{color:#666;font-size:12px;margin-bottom:22px}' +
    '  label{display:block;margin-top:18px;font-weight:600;font-size:12px;color:#555;text-transform:uppercase;letter-spacing:0.5px}' +
    '  input{width:100%;padding:11px 12px;margin-top:6px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;box-sizing:border-box;background:#fff;transition:border .15s}' +
    '  input:focus{outline:none;border-color:#4FC3F7;box-shadow:0 0 0 2px rgba(79,195,247,0.15)}' +
    '  .hint{font-size:11px;color:#aaa;margin-top:4px}' +
    '  .btn{width:100%;margin-top:28px;padding:13px;background:#4FC3F7;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}' +
    '  .btn:hover{background:#039BE5}.btn:disabled{background:#ccc;cursor:wait}' +
    '  .ok{text-align:center;margin-top:14px;font-size:13px;color:#2e7d32;display:none}' +
    '  .err{color:#c62828;font-size:12px;margin-top:10px;display:none}' +
    '</style>' +
    '<h3>API 設定</h3>' +
    '<p class="sub">Meta Developer Portal で取得した値を入力</p>' +
    '<label>User ID</label>' +
    '<input type="text" id="userId" placeholder="例: 12345678901234567" value="' + safeUserId + '">' +
    '<div class="hint">API Explorer に表示される数値ID</div>' +
    '<label>Access Token</label>' +
    '<input type="text" id="token" placeholder="例: THQWF1a2b3c..." value="' + tokenPlaceholder + '" onfocus="if(this.value.includes(\'設定済み\'))this.value=\'\'">' +
    '<div class="hint">Generate Token で生成したトークン</div>' +
    '<div class="err" id="err"></div>' +
    '<button class="btn" id="b" onclick="save()">保存してシート初期化</button>' +
    '<div class="ok" id="ok">保存しました！</div>' +
    '<script>' +
    'function save(){' +
    '  var u=document.getElementById("userId").value.trim();' +
    '  var t=document.getElementById("token").value.trim();' +
    '  var e=document.getElementById("err");' +
    '  e.style.display="none";' +
    '  if(!u||!t||t.includes("設定済み")){showErr("両方入力してください");return}' +
    '  if(!/^\\d+$/.test(u)){showErr("User IDは数字のみです");return}' +
    '  if(t.length<10){showErr("Access Tokenが短すぎます");return}' +
    '  var b=document.getElementById("b");b.disabled=true;b.textContent="保存中...";' +
    '  google.script.run.withSuccessHandler(function(){' +
    '    document.getElementById("ok").style.display="block";b.textContent="完了！";' +
    '    setTimeout(function(){google.script.host.close()},1500)' +
    '  }).withFailureHandler(function(err){showErr(err.message);b.disabled=false;b.textContent="保存してシート初期化"})' +
    '  .saveSettings(u,t)}' +
    'function showErr(m){var e=document.getElementById("err");e.textContent=m;e.style.display="block"}' +
    '</script>'
  ).setWidth(440).setHeight(430);
  SpreadsheetApp.getUi().showModalDialog(html, 'API 設定');
}

function saveSettings(userId, token) {
  // サーバーサイドバリデーション
  if (!/^\d+$/.test(userId)) throw new Error('User IDは数字のみです');
  if (!token || token.length < 10) throw new Error('Access Tokenが無効です');

  var props = PropertiesService.getScriptProperties();
  props.setProperty('THREADS_USER_ID', userId);
  props.setProperty('THREADS_ACCESS_TOKEN', token);
  _cfgCache = null; // キャッシュクリア
  initSheet();
}

// ============================================
// ウォッチドッグ（監視アラート）
// ============================================

function createWatchdog() {
  deleteWatchdogSilent_();
  ScriptApp.newTrigger('watchdog')
    .timeBased()
    .everyHours(6)
    .create();
  SpreadsheetApp.getUi().alert(
    '監視アラートを有効にしました（6時間おき）。\n\n' +
    '以下の異常を検知するとメールで通知します:\n' +
    '・自動投稿トリガーが消えている\n' +
    '・3時間以上前に投稿予定だったのに待機中のまま'
  );
}

function deleteWatchdog() {
  var count = deleteWatchdogSilent_();
  SpreadsheetApp.getUi().alert(
    count > 0
      ? '監視アラートを停止しました。'
      : '監視アラートは設定されていませんでした。'
  );
}

function deleteWatchdogSilent_() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'watchdog') {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  return count;
}

function watchdog() {
  var issues = [];

  // チェック1: processScheduledPostsトリガーが存在するか
  var triggers = ScriptApp.getProjectTriggers();
  var hasMainTrigger = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processScheduledPosts') {
      hasMainTrigger = true;
      break;
    }
  }
  if (!hasMainTrigger) {
    issues.push('自動投稿トリガー（processScheduledPosts）が存在しません。投稿が止まっています。');
  }

  // チェック2: 3時間以上前に予定されていたのに待機中の行がないか
  var sheet = getPostSheet_();
  var now = new Date();
  var threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  var overdueCount = 0;

  if (sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var allData = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();
      for (var j = 0; j < allData.length; j++) {
        var status = allData[j][COL.STATUS - 1];
        if (status !== '待機中') continue;

        var date = allData[j][COL.DATE - 1];
        if (!date) continue;

        var h = parseInt(allData[j][COL.HOUR - 1], 10) || 0;
        var m = parseInt(allData[j][COL.MINUTE - 1], 10) || 0;
        var scheduled = new Date(date);
        scheduled.setHours(h, m, 0, 0);

        if (scheduled < threeHoursAgo) {
          overdueCount++;
        }
      }
    }
  }

  if (overdueCount > 0) {
    issues.push('投稿予定時刻を3時間以上過ぎた待機中が ' + overdueCount + ' 件あります。');
  }

  // 問題があればメール送信
  if (issues.length > 0) {
    var email = Session.getActiveUser().getEmail();
    var ssUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    var subject = '【自動投稿】異常検知アラート';
    var body = '自動投稿システムで問題が検出されました。\n\n' +
      issues.join('\n') +
      '\n\n■ 対処方法\n' +
      '1. スプレッドシートを開く: ' + ssUrl + '\n' +
      '2.「自動投稿」メニュー →「トリガー ON（1分間隔）」で再設定\n' +
      '3. 必要に応じて「日付リスケ」で日程を調整\n\n' +
      '検知時刻: ' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');

    MailApp.sendEmail(email, subject, body);
    Logger.log('アラートメール送信: ' + email + ' / ' + issues.join(', '));
  } else {
    Logger.log('ウォッチドッグ: 異常なし');
  }
}

// ============================================
// 未投稿リスケジュール
// ============================================

function showRescheduleDialog() {
  var today = new Date();
  var tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  var defaultDate = Utilities.formatDate(tomorrow, Session.getScriptTimeZone(), 'yyyy/MM/dd');

  var html = HtmlService.createHtmlOutput(
    '<style>' +
    '  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px 28px;color:#1a1a1a;background:#fafafa}' +
    '  h3{margin:0 0 4px;font-size:19px;font-weight:700;letter-spacing:-0.3px}' +
    '  .sub{color:#666;font-size:12px;margin-bottom:22px}' +
    '  label{display:block;margin-top:18px;font-weight:600;font-size:12px;color:#555;text-transform:uppercase;letter-spacing:0.5px}' +
    '  input{width:100%;padding:11px 12px;margin-top:6px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;box-sizing:border-box;background:#fff;transition:border .15s}' +
    '  input:focus{outline:none;border-color:#4FC3F7;box-shadow:0 0 0 2px rgba(79,195,247,0.15)}' +
    '  .hint{font-size:11px;color:#aaa;margin-top:4px}' +
    '  .btn{width:100%;margin-top:28px;padding:13px;background:#4FC3F7;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}' +
    '  .btn:hover{background:#039BE5}.btn:disabled{background:#ccc;cursor:wait}' +
    '</style>' +
    '<h3>日付リスケ</h3>' +
    '<p class="sub">待機中の全行を指定日から順に詰め直します</p>' +
    '<label>再開日</label>' +
    '<input type="text" id="startDate" value="' + defaultDate + '" placeholder="2026/03/27">' +
    '<div class="hint">この日の朝から順に詰め直します</div>' +
    '<label>1日の投稿時間帯</label>' +
    '<input type="text" id="hours" value="7,9,12,15,19,21" placeholder="7,9,12,15,19,21">' +
    '<div class="hint">カンマ区切りで時間を指定</div>' +
    '<button class="btn" onclick="run()">リスケ実行</button>' +
    '<script>' +
    'function run(){' +
    '  var d=document.getElementById("startDate").value;' +
    '  var h=document.getElementById("hours").value;' +
    '  var b=document.querySelector(".btn");b.disabled=true;b.textContent="処理中...";' +
    '  google.script.run.withSuccessHandler(function(msg){alert(msg);google.script.host.close()}).rescheduleUnposted(d,h);' +
    '}' +
    '</script>'
  ).setWidth(440).setHeight(380);

  SpreadsheetApp.getUi().showModalDialog(html, '日付リスケ');
}

function rescheduleUnposted(startDateStr, hoursStr) {
  var sheet = getPostSheet_();
  if (!sheet) return '投稿管理シートが見つかりません。';

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return '待機中データがありません。';

  // 開始日パース
  var parts = startDateStr.split(/[\/\-]/);
  if (parts.length !== 3) return '日付フォーマットエラー: ' + startDateStr;
  var baseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

  // 時間帯パース
  var hours = hoursStr.split(',').map(function(h) { return parseInt(h.trim()); }).sort(function(a, b) { return a - b; });
  if (hours.length === 0) return '時間帯が指定されていません。';

  // 待機中行を収集
  var allData = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();
  var unpostedRows = [];
  for (var i = 0; i < allData.length; i++) {
    if (allData[i][COL.STATUS - 1] === '待機中') {
      unpostedRows.push(i + 2); // シート行番号
    }
  }

  if (unpostedRows.length === 0) return '待機中の行がありません。';

  // 日付・時間を順番に割り当て
  var dayOffset = 0;
  var hourIndex = 0;
  var count = 0;

  for (var j = 0; j < unpostedRows.length; j++) {
    var rowNum = unpostedRows[j];

    var postDate = new Date(baseDate);
    postDate.setDate(postDate.getDate() + dayOffset);

    var postHour = hours[hourIndex];
    var postMinute = Math.floor(Math.random() * 50) + 5;

    var dateFormatted = Utilities.formatDate(postDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');
    sheet.getRange(rowNum, COL.DATE).setValue(dateFormatted);
    sheet.getRange(rowNum, COL.HOUR).setValue(postHour);
    sheet.getRange(rowNum, COL.MINUTE).setValue(postMinute);

    count++;
    hourIndex++;
    if (hourIndex >= hours.length) {
      hourIndex = 0;
      dayOffset++;
    }
  }

  var endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + dayOffset);
  var endFormatted = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');

  return 'リスケ完了！\n' + count + '件の待機中を ' + startDateStr + ' 〜 ' + endFormatted + ' に再配置しました。';
}

// ============================================
// Web App（データ受信 → 書き込み → 書式適用）
// ============================================

/**
 * POST でTSVデータを受け取り、シートに書き込み、書式を適用する。
 * connector.py / Selenium 不要で完全自動転記が可能。
 *
 * リクエスト例:
 *   POST { "tsv": "1\t\"テキスト\"\t単体\t2026/04/01\t7\t0\t200\t下書き\n..." }
 *   POST { "action": "clear" }      // データ消去 + 書式リセット
 *   POST { "action": "refresh" }     // 書式リセットのみ
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // APIキー検証（ScriptPropertiesに WEBAPP_KEY が設定されている場合のみ）
    var props = PropertiesService.getScriptProperties();
    var storedKey = props.getProperty('WEBAPP_KEY');
    if (storedKey && body.key !== storedKey) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error', message: '認証エラー: keyが無効です'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('投稿管理');
    if (!sheet) {
      sheet = ss.insertSheet('投稿管理');
    }

    // --- アクション処理 ---
    if (body.action === 'clear') {
      var lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).clearContent();
      }
      var R = Math.max(lastRow + 100, 300);
      applyPostSheetFormat_(sheet, R);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok', message: 'データ消去 + 書式リセット完了'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'refresh') {
      var lastRow2 = Math.max(sheet.getLastRow(), 2);
      var R2 = Math.max(lastRow2 + 100, 300);
      applyPostSheetFormat_(sheet, R2);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok', message: '書式リセット完了'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- TSVデータ書き込み ---
    if (!body.tsv) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error', message: 'tsvフィールドが必要です'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 既存データの末尾を取得（追記モード）
    var startRow = Math.max(sheet.getLastRow() + 1, 2);

    // TSVパース
    var rows = parseTsv_(body.tsv);
    if (rows.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error', message: 'TSVデータが空です'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // データ書き込み（8列 → 13列に拡張、残りは空）
    var writeData = rows.map(function(row) {
      var padded = row.slice(0, TOTAL_COLS);
      while (padded.length < TOTAL_COLS) padded.push('');
      return padded;
    });

    sheet.getRange(startRow, 1, writeData.length, TOTAL_COLS).setValues(writeData);

    // 書式適用
    var totalRows = Math.max(startRow + writeData.length + 100, 300);
    applyPostSheetFormat_(sheet, totalRows);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: rows.length + '件を転記しました',
      rows: rows.length,
      startRow: startRow
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', message: maskToken_(err.message)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * TSV文字列をパースする（ダブルクォート内の改行・タブに対応）
 */
function parseTsv_(tsv) {
  var rows = [];
  var current = [];
  var field = '';
  var inQuote = false;
  var i = 0;

  while (i < tsv.length) {
    var ch = tsv[i];

    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < tsv.length && tsv[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuote = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
        i++;
      } else if (ch === '\t') {
        current.push(field);
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        current.push(field);
        field = '';
        if (ch === '\r' && i + 1 < tsv.length && tsv[i + 1] === '\n') i++;
        i++;
        if (current.length > 1 || (current.length === 1 && current[0] !== '')) {
          rows.push(current);
        }
        current = [];
      } else {
        field += ch;
        i++;
      }
    }
  }
  // 最終行
  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1 || (current.length === 1 && current[0] !== '')) {
      rows.push(current);
    }
  }

  return rows;
}
