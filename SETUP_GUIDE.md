# 🔧 セットアップガイド

**所要時間：1〜2 時間**

このガイドに従えば、誰でも 30 分でセットアップが完了します。

---

## Phase 1: 環境準備（10 分）

### ステップ 1-1: ファイルをダウンロード

```bash
# プロジェクトフォルダを作成
mkdir ~/threads-asp-system
cd ~/threads-asp-system

# ファイルをコピー（提供されたzipを解凍）
# または git clone https://...
```

### ステップ 1-2: Python 環境チェック

```bash
python3 --version
# 出力例: Python 3.10.5
# 3.8 以上であれば OK
```

**もし Python がない場合：**
- Mac: `brew install python3`
- Windows: https://www.python.org/ から最新版をインストール

### ステップ 1-3: Node.js チェック

```bash
node --version
npm --version
```

**もし Node.js がない場合：**
- Mac: `brew install node`
- Windows: https://nodejs.org/ から LTS 版をインストール

### ステップ 1-4: 必要なパッケージをインストール

```bash
# Google Apps Script CLI（clasp）をインストール
npm install -g @google/clasp

# Python パッケージをインストール
pip install pyperclip requests
```

---

## Phase 2: Google スプレッドシート＆Apps Script 設定（40 分）

### ステップ 2-1: Google アカウントでログイン

```bash
clasp login
# ブラウザが開いて Google ログイン画面が表示されます
# 「許可」をクリック
```

### ステップ 2-2: Apps Script プロジェクトを作成

```bash
cd nuko-threads  # プロジェクト内に移動
clasp create --type sheets --title "Threads投稿管理"
# 「Create a new project」を選択（Google Cloud Project）
```

このコマンドが完了すると、以下が自動生成されます：
- `.clasp.json` ファイル
- Google スプレッドシート

### ステップ 2-3: `.clasp.json` の `rootDir` を設定（重要！）

```bash
cat .clasp.json
```

出力例：
```json
{
  "scriptId": "1a2b3c4d5e6f7g8h9i0j",
  "rootDir": ""
}
```

**`rootDir` が空の場合、以下を実行：**

```bash
# 現在のディレクトリをコピー
pwd
# /Users/yourname/threads-asp-system/nuko-threads と表示される

# .clasp.json を編集
vim .clasp.json
# または、そのままコピペで上書き：
```

```json
{
  "scriptId": "1a2b3c4d5e6f7g8h9i0j",
  "rootDir": "/Users/yourname/threads-asp-system/nuko-threads"
}
```

### ステップ 2-4: Apps Script コードをアップロード

```bash
# setup フォルダから appscript.gs をコピー
cp ../setup/appscript.gs ./appscript.gs
cp ../setup/appsscript.json ./appsscript.json

# Google Apps Script にアップロード
clasp push
# 出力: Pushed 2 files
# （「Skipping push」が出たら .clasp.json を確認）
```

### ステップ 2-5: Web App をデプロイ

```bash
# ブラウザで Google Apps Script エディタを開く
clasp open
```

ブラウザが開いたら：

1. **右上の「デプロイ」をクリック**
2. **「新しいデプロイ」**
3. **左の歯車アイコン** → **種類：「ウェブアプリ」**
4. **「次のユーザーとして実行」→「自分」**
5. **「アクセスできるユーザー」→「すべてのユーザー」**
6. **「デプロイ」をクリック**
7. **「Googleはこのアプリを検証していません」→「高度な」→「スレッド投稿管理に移動」**
8. **権限選択画面で「すべて選択」→「続行」**
9. **URL が表示される** → **コピーして保存**

### ステップ 2-6: スプレッドシート URL を config.json に設定

```bash
# clasp open でスプレッドシートを開いたブラウザタブから URL をコピー
# https://docs.google.com/spreadsheets/d/xxxxx/edit

# config.json を編集
vim config.json
# または vim nuko-threads/config.json
```

以下を追加：

```json
{
  "spreadsheet_url": "https://docs.google.com/spreadsheets/d/xxxxx/edit",
  "webapp_url": "https://script.google.com/macros/d/xxxxx/usercontent",
  "webapp_key": "生成するキーを入力（次のステップ）"
}
```

### ステップ 2-7: Web App キーを生成＆設定

```bash
# キーを生成
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# 出力例: 8K_wQ3vR...KmPx

# このキーを config.json に貼り付け
vim config.json
# webapp_key: "8K_wQ3vR...KmPx"

# GAS にも設定する場合は別途ドキュメント参照
```

---

## Phase 3: config.json を自分の環境に設定（15 分）

### ステップ 3-1: config-template.json をコピー

```bash
cp templates/config-template.json config.json
vim config.json
```

### ステップ 3-2: 必須項目を入力

```json
{
  "schedule": {
    "start_date": "2026-04-12",        // 投稿開始日（今日以降の日付）
    "posting_hours": [7, 9, 12, 15, 19, 21],  // 投稿時間帯
    "links_enabled": true,              // リンク挿入 ON/OFF
    "links_per_day": 2                  // 1日あたりのリンク本数
  },

  "asp_affiliate_tool": {
    "enabled": true,
    "data_path": "./asp-affiliate-tool/data.json",
    "auto_assign_links": true,
    "link_campaign": "threads_general"
  },

  "spreadsheet_url": "https://docs.google.com/spreadsheets/d/xxxxx/edit",
  "webapp_url": "https://script.google.com/macros/d/xxxxx/usercontent",
  "webapp_key": "生成したキー"
}
```

---

## Phase 4: content ファイルを作成（20 分）

### ステップ 4-1: strategy.md を作成

```bash
vim content/strategy.md
```

以下を入力（例）：

```markdown
# Threads投稿戦略

## ペルソナ
- 年代: 25-35 歳
- 性別: 女性
- 悩み: 美容・健康・ファッション

## コンセプト
「毎日のスキンケア習慣で、自分への投資を実感」

## よく使う語彙
- セラム、美容液、コスメ
- 毎日、習慣、ケア
- 肌、ツルツル、潤い

## 主なテーマ
1. 美容・スキンケア
2. 健康・サプリメント
3. ファッション・コーディネート
```

### ステップ 4-2: rules.md を作成

```bash
cp templates/rules-template.md content/rules.md
vim content/rules.md
```

以下を入力（例）：

```markdown
# Threads投稿生成ルール

## 基本ルール
- 文字数: 200-500字
- 投稿形式: 単体 6-7本 + スレッド 3-4本

## 高成約パターン
### パターン A: 悩み → 解決策 → 成果
例）「毎日のスキンケアが大事と気づいた」
→「このセラムを使い始めた」
→「肌がツルツルになった！」

### パターン B: 実体験 → なぜ？ → 推奨
例）「春は新しい洋服で気分リセット」
→「このワンピースは何回も着回せる」
→「値段以上の価値がある」

## CTA（行動喚起）
- スレッド型のみ CTA を含める
- 「気になった方はこちら」「詳しくはプロフ」などを自然に挿入
- PR 表記は必須
```

### ステップ 4-3: structures.md を確認

```bash
cat content/structures.md
# テンプレートがあれば OK（修正不要）
```

---

## Phase 5: テスト実行（15 分）

### ステップ 5-1: 投稿を生成

```bash
cd nuko-threads
python scheduler.py --help
# 出力が表示されれば OK

# テスト投稿を生成（10本）
# （詳細は OPERATION.md を参照）
```

### ステップ 5-2: ダッシュボードを確認

```bash
# ブラウザで開く
open ../asp-affiliate-tool/standalone-viewer.html

# または
start ../asp-affiliate-tool/standalone-viewer.html  # Windows
```

以下が表示されれば成功：
- 📈 概要タブ - 成約12件、売上¥74,000
- 🔗 リンクタブ - 5個のリンク
- ✅ 成約タブ - 成約記録
- 📝 投稿タブ - 投稿別成約

---

## ✅ セットアップ完了チェック

すべてチェック出来たら **セットアップ完了** です！

- [ ] Python 3.8+ がインストールされている
- [ ] Node.js がインストールされている
- [ ] `clasp login` で認証した
- [ ] Google スプレッドシートが作成された
- [ ] `.clasp.json` に `rootDir` が設定されている
- [ ] `clasp push` でコードがアップロードされた
- [ ] Web App がデプロイされている
- [ ] Web App URL が config.json に設定されている
- [ ] `config.json` に `spreadsheet_url` が入っている
- [ ] `content/strategy.md` が作成されている
- [ ] `content/rules.md` が作成されている
- [ ] ダッシュボード（standalone-viewer.html）がブラウザで開ける

---

## 🚨 よくあるエラーと対策

### エラー: "Skipping push"
**原因:** `.clasp.json` の `rootDir` が空または間違っている
**対策:** ステップ 2-3 を確認

### エラー: "Permission denied" (appscript.gs)
**原因:** `clasp push` する権限がない
**対策:** `clasp login` を再度実行

### エラー: スプレッドシートが開かない
**原因:** URL が config.json に正しく設定されていない
**対策:** ステップ 2-6 を確認

### その他のエラー
→ **TROUBLESHOOT.md** を参照

---

## 次のステップ

セットアップが完了したら、**OPERATION.md** を読んで日々の操作方法を学びましょう！

