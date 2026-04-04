# Threads Auto Post — 自動投稿システム

Threads投稿の生成・スケジューリング・自動投稿を一貫して行うシステム。
Claude Code がコンテンツを生成し、Google スプレッドシート + Apps Script で予約投稿する。

## あなたの役割

`content/strategy.md` のコンセプト定義と `content/structures.md` の構成パターンに基づき、`content/rules.md` の生成ルールに従って高品質な Threads 投稿を量産する。

---

## 初回セットアップ（ユーザーが「セットアップして」と言ったら実行）

### Phase 0: 環境チェック & 自動インストール

ユーザーの環境に必要なツールが揃っているか確認し、不足分を自動インストールする。
**ユーザーに技術的な操作は一切させない。** インストールが必要な場合は「○○をインストールします」と一言伝えてから実行する。

#### 0-0. ⚠️ Claude Codeのログイン方法チェック（最重要・必ず最初に実行）

セットアップを開始する前に、**必ず以下のメッセージをユーザーに表示する：**

```
⚠️ 重要な確認です！

Claude Codeのログイン方法を確認させてください。
「APIキー」でログインしていると従量課金（使った分だけ請求）になり、
想定外の高額請求が発生する可能性があります。

✅ 正しいログイン方法：Anthropicアカウント（メールアドレス）でログイン
❌ 間違い：APIキーでログイン

もし「APIクレジット残高が不足しています」等のメッセージが表示された場合は、
すぐに作業を中断し、ログアウトしてAnthropicアカウントで再ログインしてください。

Proプラン（$20/月）をご契約中であれば、追加料金なしで使えます。
```

この確認をスキップしてはいけない。ユーザーが「大丈夫」と回答してから次のステップに進むこと。

#### 0-1. OS判定
- `uname` または `$env:OS` でMac/Windowsを判定
- 以降のコマンドをOS に応じて切り替える

#### 0-2. Python
```bash
# 確認
python3 --version || python --version
```
- **未インストールの場合:**
  - Mac: `brew install python` （Homebrewがなければ先にHomebrewをインストール）
  - Windows: `winget install Python.Python.3` または公式インストーラのURLを案内

#### 0-3. Node.js
```bash
node --version
```
- **未インストールの場合:**
  - Mac: `brew install node`
  - Windows: `winget install OpenJS.NodeJS.LTS`

#### 0-4. clasp
```bash
clasp --version
```
- **未インストールの場合:** `npm install -g @google/clasp`

#### 0-5. 確認メッセージ
すべて揃ったら以下を表示：
```
✅ 環境チェック完了！
  Python:  (バージョン)
  Node.js: (バージョン)
  clasp:   (バージョン)

セットアップを続けます。
```

---

### Phase 1: コンセプト作成

1. `templates/concept_questions.md` を読む
2. ユーザーに質問を順番に投げる（対話形式）
3. 回答を元に以下を自動生成：
   - `content/strategy.md`（ペルソナ・頻出ワード・テーマ集）
4. 生成後ユーザーに確認を取る

### Phase 2: Threads API 接続

1. ユーザーに Threads アクセストークンを聞く
2. `clasp` をインストール（未インストールの場合）
3. `clasp login` でブラウザ認証（※ユーザーに手動操作を依頼）
4. Apps Script API を有効化してもらう（URLを提示）

#### ⚠️ トークン取得時のよくあるエラー
- **PCブラウザで、APIトークンを取得したいThreadsアカウント（Instagramアカウント）にログインした状態**でトークン生成ページを操作する必要がある
- 別のアカウントでログインしているとOAuthエラーになる
- エラーが出た場合は「ブラウザでAPIを取得したいアカウントにログインし直してください」とユーザーに伝える
- **Proプラン（$20/月）のユーザー向け注意**: コンピューターユーズでのブラウザ操作はトークン消費が大きいため、トークン取得は手動で行うことを推奨する。ユーザーに手順を案内し、取得したトークンを貼り付けてもらう形が効率的

### Phase 3: スプレッドシート & Apps Script

1. `clasp create --type sheets --title "Threads投稿管理"` で作成
2. **clasp create直後に `.clasp.json` の `rootDir` を確認・修正する（必須）：**
   ```bash
   cat .clasp.json
   ```
   `"rootDir": ""` が空の場合、clasp pushが「Skipping push」になる。
   `.clasp.json` があるディレクトリの絶対パスを設定すること：
   ```json
   {
     "scriptId": "...",
     "rootDir": "/Users/ユーザー名/.../nuko-threads-v2"
   }
   ```
   ※ `rootDir` は `.clasp.json` が存在するディレクトリの絶対パスにする
3. `setup/appscript.gs` と `setup/appsscript.json` を `.clasp.json` と同じディレクトリにコピー
4. `onOpen()` にトークン自動設定を一時的に追加
5. `clasp push` でコードを反映（「Pushed N files」と表示されること。「Skipping push」が出たらrootDirを確認）
5. ユーザーにスプレッドシートをブラウザで開いてもらう：
   ```
   スプシが開いたら、上のメニューに「自動投稿」が表示されるので、一度ページをリロードしてください。
   「自動投稿」メニューが出たらOKです（初回のリロードでトークンが自動保存されます）。
   ```
6. ハードコードされたトークンを除去して再 push：
   ```bash
   clasp push
   ```
   ※ これでコードがクリーンな状態になる
7. `config.json` にスプレッドシート URL を設定
8. WEBAPP_KEYの生成と設定（Claude Codeが自動実行）：
   ```bash
   # APIキーを生成
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   → 生成したキーを `config.json` の `webapp_key` に設定
   → GAS側にも設定（clasp run でScriptPropertiesに直接書き込む）：
   ```bash
   clasp run setWebappKey --params '["生成したキー"]'
   ```
   ※ `setWebappKey` 関数が未定義の場合は、一時的にappscript.gsに追加してpush→run→削除→pushする：
   ```javascript
   function setWebappKey(key) {
     PropertiesService.getScriptProperties().setProperty('WEBAPP_KEY', key);
     return 'OK: WEBAPP_KEY set';
   }
   ```
9. 接続テスト（Claude Codeが自動実行）：
   ```bash
   clasp run testConnection
   ```
   → 成功したらユーザーに「接続OK」と伝える
   → 失敗したらエラー内容を確認して対処
10. Web Appデプロイ（ユーザーに依頼 — **これだけ手動、1回きり**）：
   ※ トークン除去済み・WEBAPP_KEY設定済みのクリーンな状態でデプロイするので、再デプロイは不要
   ```
   Web Appのデプロイをお願いします（これで投稿の転記が完全自動になります）。
   スプシはもう開いてると思うので、そのまま進めてください。

   メニュー「拡張機能」→「Apps Script」を開く
   → 右上の「デプロイ」→「新しいデプロイ」
   → 左の歯車アイコン → 種類「ウェブアプリ」を選択
   →「次のユーザーとして実行」→「自分」
   →「アクセスできるユーザー」→「全員」
   →「デプロイ」をクリック
   →「Googleはこのアプリを検証していません」と出たら、左下の「高度な」をクリック
   →「スレッド投稿管理に移動（安全ではありません）」をクリック
   → 権限の選択画面が出たら「すべて選択」にチェックを入れて「続行」
   → 許可が終わるとURLが表示されるので、コピーして貼り付けてください

   あとはこちらで設定を自動で行います。そのまま待っていてください。
   ```
   → ユーザーから受け取ったURLを `config.json` の `webapp_url` に自動設定する
   ※ **この手順は初回セットアップの1回きり。以降の転記はすべて自動化される**
   ※ clasp CLI ではWeb App型デプロイができないため、ここだけブラウザ操作が必要
11. シート初期化 + スプシを開く（Claude Codeが自動実行）：
    Web App経由で書式適用を実行する（clasp runはAPI Executableデプロイが必要なため使わない）：
    ```python
    import urllib.request, json
    webapp_url = "{config.jsonのwebapp_url}"
    webapp_key = "{config.jsonのwebapp_key}"
    payload = {"action": "refresh"}
    if webapp_key:
        payload["key"] = webapp_key
    req = urllib.request.Request(
        webapp_url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        print(json.loads(resp.read().decode('utf-8')))
    ```
    または `scheduler.py` がある場合は以下でも可：
    ```bash
    python3 -c "
    import urllib.request, json
    url = '{webapp_url}'
    key = '{webapp_key}'
    payload = {'action': 'refresh'}
    if key: payload['key'] = key
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
    resp = urllib.request.urlopen(req)
    print(json.loads(resp.read().decode('utf-8')))
    "
    ```
    → レスポンスに `"status": "ok"` が含まれていることを確認する
    → エラーや空レスポンスが返った場合は、GAS権限が未承認の可能性がある。以下を試す：
      1. ユーザーにスプシを開いてもらい「自動投稿」メニューが表示されるか確認
      2. 表示されない場合は「拡張機能」→「Apps Script」→ エディタ上部の「実行」で `initSheet` を手動実行
      3. 「認証が必要です」ダイアログが出たら認証を完了してもらう
      4. 認証後、再度Web App経由でrefreshを送信
    → 成功を確認してからスプシをブラウザで自動オープン：
    ```bash
    # Mac
    open "{config.jsonのspreadsheet_url}"
    # Windows
    start "{config.jsonのspreadsheet_url}"
    ```
    → ユーザーの画面に書式適用済みのスプシが表示された状態でセットアップ完了：
    ```
    ✅ セットアップ完了！

    スプシを開きました。ヘッダーや書式が入った状態になっていればOKです。
    投稿を生成する準備が整いました。
    「メニュー」と言えば操作メニューが出ます。
    「○月○日まで生成して」と言えばまとめて生成＋転記します。
    ```

### アップデート（ユーザーが「アップデートして」「更新して」と言ったら実行）

既にセットアップ済みの環境に最新版を反映する。
**ユーザーに技術的な操作は一切させない。**
**既存の投稿データ・トリガー・スケジュールには一切影響しない。**

1. `.clasp.json` を探す（カレントディレクトリまたはプロジェクト内を検索）
2. `.clasp.json` が見つからない場合 → 「先にセットアップが必要です。『セットアップして』と言ってください」と伝えて終了

3. clasp認証の確認：
   ```bash
   clasp login --status
   ```
   認証切れの場合は `clasp login` を実行（ブラウザでの認証が必要）

4. `.clasp.json` があるディレクトリの **既存.gsファイルを削除してから** 新しいファイルをコピー：
   ```bash
   # ⚠️ 重要: Code.gs等の旧ファイルが残ると関数が重複してバグる
   rm -f {claspディレクトリ}/*.gs {claspディレクトリ}/*.json
   # ※ .clasp.json は消さない（上のワイルドカードでは消えないが念のため確認）
   ```
   その後、以下をコピー：
   - `setup/appscript.gs` → `.clasp.json` と同じディレクトリ
   - `setup/appsscript.json` → `.clasp.json` と同じディレクトリ
   - `scheduler.py`
   - `connector.py`
   - `CLAUDE.md`
   - `content/rules.md`
   - `content/structures.md`

5. `clasp push` を実行
   ※ `.clasp.json`のあるディレクトリに`Code.gs`等の旧ファイルが残っていないことを必ず確認してからpushする

6. Web Appが設定済み（`config.json` に `webapp_url` がある）の場合：
   ユーザーにWeb Appの再デプロイを案内（コード更新を反映するため）：
   ```
   コードを更新しました。Web Appに反映するため、以下をお願いします：
   1. スプシを開く →「拡張機能」→「Apps Script」
   2. 「デプロイ」→「デプロイを管理」
   3. 鉛筆アイコン → バージョン「新しいバージョン」
   4. 「デプロイ」をクリック
   ```

**⚠️ 以下のファイルは絶対に上書きしないこと（テスター固有データ）：**
- `content/strategy.md`（コンセプト・ペルソナ設定）
- `config.json`（スプシURL・スケジュール設定・webapp_url）
- `links.json`（リンク設定）
- `output/` 配下のファイル（生成済み投稿）
- `.clasp.json`（GASプロジェクト紐付け）

7. 完了後、以下を表示：

```
✅ アップデート完了！

更新内容：
・投稿生成ルールの改善（ハッシュタグ廃止、スレッド品質向上、べた書き追加）
・スプシ転記の安定性向上
・スケジューラーの改行バグ修正

既存の投稿データ・予約・トリガーには影響ありません。
```

### Phase 4: 投稿生成 & 転記

1. ユーザーに期間を聞く（例：「4/30まで」）
2. `config.json` のスケジュール設定に基づきバッチ数を計算
3. 投稿を生成 → `output/` に保存
4. `scheduler.py` で TSV 変換（ステータスは「下書き」で出力される）
5. Apps Script Web App 経由でスプレッドシートに転記
6. 転記後、スプレッドシートをブラウザで自動的に開く：
   ```bash
   # Mac
   open "{config.jsonのspreadsheet_url}"
   # Windows
   start "{config.jsonのspreadsheet_url}"
   ```
   ※ URLをテキストで表示するのではなく、必ずブラウザを起動してスプシを直接開くこと
7. 転記後、ユーザーに以下を伝える：

```
転記完了！スプシを開きました。
確認できたら、H列を「下書き」→「待機中」に変更してください。
トリガーONなら予約時刻に自動投稿されます。
```
   ※ スプシのURLを直接表示しない。「スプシどこ？」と聞かれたら `open` コマンドで再度開く

---

## 操作メニュー

ユーザーが「メニュー」と言ったら以下を表示：

```
============================================
  Threads Auto Post
============================================

  [1] 投稿生成（1バッチ＝10本）
  [2] まとめて生成 + 転記
  -------------------------------------------
  [5] リンク設定（ON/OFF・links.json）
  [6] スケジュール確認（config.json）
  [7] 投稿時間の変更
  -------------------------------------------
  [C] コンセプト編集（content/strategy.md）
  [R] 生成ルール確認（content/rules.md）
  [S] 構成パターン確認（content/structures.md）
  [0] 終了
```

### メニュー動作

- **[1]** 投稿生成フローを1バッチ実行
- **[2]** 日数を聞く → 必要バッチ分を連続生成 → TSV化 → スプレッドシート転記
- **[5]** リンク挿入の ON/OFF 切替・links.json の確認・編集
- **[6]** config.json のスケジュール設定を表示
- **[7]** 投稿時間帯・間隔を変更
- **[C]** content/strategy.md を表示・編集
- **[R]** content/rules.md を表示・編集
- **[S]** content/structures.md を表示・編集
- **[0]** 終了

---

## [5] リンク設定メニュー

```
============================================
  リンク設定
============================================
  現在: {links_enabled} / 1日 {links_per_day} 本
  遅延: {link_delay_min}〜{link_delay_max} 分後
============================================

  [A] リンク挿入 ON/OFF
  [B] 1日あたりの本数変更
  [C] links.json 表示
  [R] 戻る
```

---

## [7] 投稿時間メニュー

```
============================================
  投稿時間設定
============================================
  開始日: {start_date}
  時間帯: {posting_hours}
  分のランダム: {random_minutes}
============================================

  [A] 開始日を変更
  [B] 投稿時間帯を変更
  [C] ランダム ON/OFF
  [R] 戻る
```

---

## 投稿生成フロー

ユーザーが「生成」「スタート」「作って」等と言ったらノンストップで実行：

### Step 1: 投稿生成（10本）
1. `content/rules.md`、`content/structures.md`、`content/strategy.md` を読む
2. structures.md のパターン + strategy.md のペルソナ・語彙・テーマを組み合わせる
3. ルールに従い10本の投稿を生成（単体 6〜7本 + スレッド 3〜4本）
4. **スレッド型にはCTAを入れる**（最後の■で自然に誘導。プロフ/固定/過去投稿をローテ）
5. **単体型にはCTAを入れない**（例外的にたまに入れるのはOK）
6. フォーマット通りに出力（前置き・説明なし）

**文字数必守：単体200〜500字、スレッド1投稿あたり200〜500字**
**パターン重複禁止：1バッチ内で同じパターンを2回使わない**
**キーワード必守：各投稿にカテゴリ1・2の語彙を2〜3個入れる**
**CTA：スレッドの最後に自然に溶け込ませる。■CTAブロックは使わない。PR表記はアフィリのみ**

### Step 2: ファイル保存
`output/batch_XXXX.txt` に保存（XXXX は連番、既存最大+1）

### Step 3: TSV変換 + スプレッドシート転記

**Web App経由（推奨・完全自動）:**
```bash
python scheduler.py output/batch_XXXX.txt --post
```
※ データ消去してから転記する場合:
```bash
python scheduler.py output/batch_XXXX.txt --post --clear
```
※ `config.json` の `webapp_url` が設定済みであること。

**フォールバック（Web App未設定時）:**
```bash
python scheduler.py output/batch_XXXX.txt --clipboard
```
→ `python connector.py` でSelenium貼り付け → スプシで「自動投稿」→「書式リセット」を手動実行

---

## 投稿の抽出ルール

### フォーマット
```
[投稿]
（本文）
==========
```

### スレッド投稿
```
[投稿]
■1
（1つ目の本文）
■2
（2つ目の本文）
==========
```
`■N` で始まる行がある場合、同一スレッドとして扱う。A列に同じ番号を振る。

### CTA付き投稿（ツリーCTA）
```
[投稿]
（本文 — リンクなし・CTA匂わせなし）
■CTA
PR 気になった方はこちらも参考になるかも → {リンクURL}
==========
```
`■CTA` で始まるブロックはツリーCTA（セルフリプライ）として扱う。
メイン投稿とは別のタイミング（数時間後）で投稿される。
scheduler.py がこのブロックを検知し、スプレッドシート上で遅延投稿としてスケジューリングする。

---

## ファイル構成

```
threads-auto-post/  （フォルダ名は任意）
├── CLAUDE.md              ← このファイル
├── config.json            ← スケジュール・スプレッドシートURL
├── scheduler.py           ← TSV変換スクリプト
├── connector.py           ← スプレッドシート連携（Selenium）
├── links.json             ← 宣伝リンク定義
├── setup/
│   └── appscript.gs       ← Google Apps Script コード
├── content/
│   ├── rules.md           ← 投稿生成ルール・品質基準
│   ├── structures.md      ← 投稿構成パターン集
│   └── strategy.md        ← ペルソナ・語彙・テーマ（自動生成）
├── templates/
│   └── concept_questions.md ← コンセプト作成用の質問集
├── output/                ← 生成投稿の保存先
│   └── archive/           ← 転記済みファイル
└── .claude/
    └── commands/          ← スラッシュコマンド定義
```

---

## 重要ルール

- **投稿生成は Claude 自身が直接行う**（外部API不要）
- **サブエージェント（Task tool）で投稿を生成してはいけない**（ルール未伝達により品質が下がる）
- 生成投稿は `output/` に保存する
- 転記済みファイルは `output/archive/` に移動する
- バッチ生成（[2]）でも Claude 自身がすべて生成すること

---

## BAN対策・リンク安全ルール

> **免責事項**: 本ツールにはBAN対策のナレッジが組み込まれていますが、Threadsのアカウント凍結を100%防ぐことはできません。プラットフォーム側の判断によるアカウントの凍結・制限・停止等について、本ツールの提供元は一切の責任を負いかねます。ユーザーがセットアップ時にこの点を理解しているか、初回に確認すること。

### リンク掲載のリスク管理
- **アカウント超初期（3〜4日）はリンクを一切貼らない**
- noteやオプチャの直リンクはBANリスクあり → **Notionページを1枚挟んで誘導**
- 投稿本文にリンクを貼らず、**プロフィール or 固定投稿にだけ**置くのが安全
- プロフリンクからはクリックされにくい → **固定投稿にリンクをわかりやすく置く**のが効果的
- リットリンク等の複数選択肢ページはクリック率が激減 → **リンクは1つに絞る**

### アカウント運用
- 1端末でアカウント5個より多く保有しない（同じ端末に多数 = 疑われやすい）
- 使っていないアカウントは削除しておく
- 事前にInstagramアカウントも作っておく（アカウントの歴 = 信頼性）
- 大量フォロー・大量いいねなどのロボット的な動きは避ける
- アカウントの転生（コンセプト変更）は問題ない。Threadsはジャンル認知が弱いのでガラッと変えても影響なし。新規作成より既存垢を変える方が安全

### 投稿時の注意
- 薬事法・景品表示法は当然遵守。体験談かどうかは関係ない
- アフィリエイトリンクにはPR表記必須（ステマ規制法対応）
- 「コメントしてね」「いいねしてね」系のエンゲージメントベイトは使った時点でリーチ激減

---

## リスト構築の知識（投稿生成に影響する部分）

### Threadsの構造的特徴
- フォロワーが増えやすい反面、ユーザーの興味がすぐ散る
- フォローされても翌日には忘れられるのがThreadsの構造
- **Threadsでの「薄い関心」を、リスト（オプチャ・LINE）に流して「濃い関係」に変える**のが成果を出す人の共通点
- リスト運用なしだとフォロワーが増えても「ハリボテアカウント」になる

### 投稿生成への影響
- 投稿は「リスト獲得」を最終目的として設計する
- 10本中8本は純粋な価値提供、2本はCTA（商品 or リスト誘導）
- バズった投稿のタイミングでリスト誘導投稿を追加生成できるよう準備しておく
- 固定投稿は「自己紹介 + 提供価値 + リスト誘導リンク」の構成がベスト

### 推奨導線
```
Threads投稿 → 固定投稿 or プロフ → Notionページ → オプチャ → 公式LINE → 無料note
```
- 投稿本文にはリンクを貼らない
- 固定投稿にNotionページへのリンクを設置
- Notionページからオプチャ or 公式LINEに誘導
- LINE挨拶メッセージで無料noteを自動配布

### コンセプト設計の影響
- 投稿で伸びるかどうかは**コンセプトで8割決まる**
- コンセプトの3要素: 悩み（Before）→ 手段（How）→ 理想未来（After）
- 「新しさ」が最大の武器。実績の大きさより「新概念の提唱」の方がアカウント伸びる
- strategy.md 生成時に、コンセプトの3要素が具体的に言語化できているか必ずチェック

### ジャンル別の注意点（投稿トーンに影響）
- **スピ・占い系**: 人間味を出しすぎない。神秘性と世界観が最重要。手法名（タロット等）は言わない方がいい
- **育児系**: 名詞のある悩みに特化（癇癪、夜泣き等）。共感だけだと売れない
- **健康・美容系**: ありきたりなアプローチ（運動しよう等）ではなく目新しいアプローチが鍵。薬事法遵守
- **稼ぐ系**: 実績（特にお客さん実績）がほぼ全て。実績なしだと厳しい
- **恋愛系**: Threadsでは大きな可能性を感じにくい。供給過多で差別化困難
