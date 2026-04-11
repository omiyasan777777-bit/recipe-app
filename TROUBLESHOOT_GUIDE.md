# 🆘 トラブルシューティング

セットアップ中、または操作中に問題が発生した場合はこのガイドを参照してください。

---

## 🚨 セットアップ時のエラー

### エラー 1: "Skipping push"

**症状:**
```
$ clasp push
Skipping push
```

**原因:** `.clasp.json` の `rootDir` が設定されていない

**解決方法:**
```bash
# .clasp.json を確認
cat .clasp.json

# 以下のような出力が出ていたら NG
{
  "scriptId": "1a2b3c4d5e6f7g8h9i0j",
  "rootDir": ""
}

# 修正: rootDir に現在のディレクトリパスを入力
pwd  # 現在のパスをコピー
vim .clasp.json  # このパスを rootDir に貼り付け
```

正しい例：
```json
{
  "scriptId": "1a2b3c4d5e6f7g8h9i0j",
  "rootDir": "/Users/yourname/threads-asp-system/nuko-threads"
}
```

**再度実行:**
```bash
clasp push
# Pushed 2 files
```

---

### エラー 2: "Permission denied"

**症状:**
```
Error: {"type":"script_error","message":"Script Error. Hide details"}
```

**原因:** Google Apps Script への権限がない

**解決方法:**
```bash
# 認証を再度実行
clasp logout
clasp login
# ブラウザで許可を再度クリック
```

その後、`clasp push` を再度実行。

---

### エラー 3: "Command not found: clasp"

**症状:**
```
$ clasp --version
clasp: command not found
```

**原因:** clasp がインストールされていない

**解決方法:**
```bash
# インストール
npm install -g @google/clasp

# 確認
clasp --version
```

---

### エラー 4: "No module named 'pyperclip'"

**症状:**
```
ModuleNotFoundError: No module named 'pyperclip'
```

**原因:** Python パッケージがインストールされていない

**解決方法:**
```bash
pip install pyperclip requests
```

---

## 📝 投稿生成時のエラー

### エラー 5: "TypeError: 'NoneType' object is not subscriptable"

**症状:**
```
Traceback (most recent call last):
  File "scheduler.py", line 123, in ...
TypeError: 'NoneType' object is not subscriptable
```

**原因:** `config.json` が正しく読み込まれていない

**解決方法:**
```bash
# config.json の JSON 形式を確認
python3 -m json.tool config.json

# エラーが出たら、JSON の括弧やカンマを確認
vim config.json
```

正しい JSON 形式：
```json
{
  "schedule": {
    "start_date": "2026-04-12",
    "posting_hours": [7, 9, 12, 15, 19, 21]
  }
}
```

（末尾にカンマなし、括弧がすべて閉じているか確認）

---

### エラー 6: "FileNotFoundError: content/rules.md"

**症状:**
```
FileNotFoundError: [Errno 2] No such file or directory: 'content/rules.md'
```

**原因:** `content/rules.md` が存在しない

**解決方法:**
```bash
# ファイルを作成
touch content/rules.md

# テンプレートをコピー
cp templates/rules-template.md content/rules.md

# または、以下を手動で入力
vim content/rules.md
```

最小限の内容：
```markdown
# Threads投稿生成ルール

## 基本ルール
- 文字数: 200-500字
- 投稿形式: 単体 6-7本 + スレッド 3-4本

## パターン例
実体験 → 解決 → 推奨
```

---

### エラー 7: "投稿が生成されない（出力ファイルがない）"

**症状:**
```bash
$ python scheduler.py output/batch_0001.txt --post
# 何も出力されない
$ ls output/
# batch_0001.txt が存在しない
```

**原因:** Python スクリプトがエラーで終了している（エラーメッセージが表示されていない）

**解決方法:**
```bash
# エラーメッセージを見やすく表示
python scheduler.py output/batch_0001.txt 2>&1 | head -50

# または、スクリプトを直接実行
python scheduler.py --help
```

---

## 🌐 Google スプレッドシート連携エラー

### エラー 8: "HTTP 401 Unauthorized"

**症状:**
```
HTTP Error 401: Unauthorized
```

**原因:** Web App URL が正しくない、または認証が失敗している

**解決方法:**
```bash
# config.json の webapp_url を確認
cat config.json | grep webapp_url

# URL が以下の形式か確認
# https://script.google.com/macros/d/[ScriptID]/usercontent
```

正しくない場合：
1. `clasp open` でブラウザを開く
2. 右上「デプロイ」→「デプロイを管理」
3. 最新のデプロイを確認
4. URL をコピーして config.json に貼り付け

---

### エラー 9: "スプレッドシートが開かない"

**症状:**
```bash
open ~/Desktop/dashboard.html
# または
python scheduler.py ... --post
# スプシが開かない
```

**原因:** `config.json` に `spreadsheet_url` が設定されていない

**解決方法:**
```bash
# スプレッドシートの URL をコピー
# https://docs.google.com/spreadsheets/d/xxxxx/edit

# config.json に追加
vim config.json
```

```json
{
  "spreadsheet_url": "https://docs.google.com/spreadsheets/d/xxxxx/edit"
}
```

---

## 💾 データインポート時のエラー

### エラー 10: "CSV ファイルが認識されない"

**症状:**
```
CSV ファイルをドラッグ&ドロップしても何も起こらない
```

**原因:** CSV 形式が正しくない、または文字エンコーディングが UTF-8 ではない

**解決方法:**
```bash
# CSV ファイルを確認
head -5 a8_conversions.csv

# エンコーディングを変換（必要な場合）
iconv -f SHIFT_JIS -t UTF-8 a8_conversions.csv > a8_conversions_utf8.csv
# または
python3 << 'EOF'
import pandas as pd
df = pd.read_csv('a8_conversions.csv', encoding='shift_jis')
df.to_csv('a8_conversions_utf8.csv', encoding='utf-8', index=False)
EOF
```

---

### エラー 11: "インポート後、成約データが反映されない"

**症状:**
```
ダッシュボードにインポートしたが、成約数がゼロのまま
```

**原因:** 
1. CSV の日付形式が YYYY-MM-DD ではない
2. post_id がマッチしていない
3. インポートが失敗している

**解決方法:**

#### 1. CSV の日付形式を確認
```bash
# CSV を確認
head -20 a8_conversions.csv

# 日付が以下の形式か確認
# 2026-04-08 (OK)
# 04/08/2026 (NG → 変換必要)
# 2026年4月8日 (NG → 変換必要)
```

日付が YYYY-MM-DD 形式でない場合、変換：
```bash
python3 << 'EOF'
import pandas as pd
import re

# CSV を読み込み
df = pd.read_csv('a8_conversions.csv', encoding='utf-8')

# 日付列を YYYY-MM-DD に変換
df['conversion_date'] = pd.to_datetime(df['conversion_date']).dt.strftime('%Y-%m-%d')

# 保存
df.to_csv('a8_conversions_fixed.csv', encoding='utf-8', index=False)
print("✅ 変換完了: a8_conversions_fixed.csv")
EOF
```

#### 2. post_id がマッチしているか確認
```bash
# CSV に post_id 列があるか確認
head -1 a8_conversions.csv | tr ',' '\n'

# post_id 列の内容を確認
head -5 a8_conversions.csv | cut -d',' -f [post_id_column_number]
```

post_id 列がない場合：
- A8.net / afb のダッシュボードで、UTM パラメータ（`utm_campaign=post_0001_001` など）で成約を分類しているか確認
- 確認できたら、ダッシュボード側で post_id を自動抽出できるよう設定

---

## 📊 ダッシュボード表示エラー

### エラー 12: "ダッシュボードが真っ白（データ表示されない）"

**症状:**
```
ブラウザで standalone-viewer.html を開いても、タイトルだけ表示されて中身がない
```

**原因:** 
1. JavaScript エラーがある
2. JSON データが壊れている

**解決方法:**

ブラウザの開発者ツールでエラーを確認：
1. **F12** キーを押す
2. **Console** タブをクリック
3. 赤いエラーメッセージを確認

#### よくあるエラー: "Unexpected token"
```
Uncaught SyntaxError: Unexpected token '}' in JSON at line 123
```

**原因:** `data.json` の JSON 形式が壊れている

**修正:**
```bash
# JSON を検証
python3 -m json.tool asp-affiliate-tool/data.json

# エラーが出た場所を確認して修正
vim asp-affiliate-tool/data.json
```

---

## 🔄 完全リセット（最終手段）

もしセットアップをやり直したい場合：

```bash
# 1. 既存ファイルをバックアップ
cp -r nuko-threads nuko-threads.backup
cp -r asp-affiliate-tool asp-affiliate-tool.backup

# 2. 新しくセットアップ
# SETUP.md の Phase 1 から再度実行

# 3. 古いデータを削除（慎重に）
rm -rf output/batch_*.txt
rm -rf .clasp.json
```

---

## 📞 それでも解決しない場合

以下の情報を記録して、サポートに問い合わせてください：

1. **Python バージョン** → `python3 --version`
2. **Node.js バージョン** → `node --version`
3. **エラーメッセージ（全文）**
4. **実行した操作**
5. **OS（Mac / Windows / Linux）**

例：
```
Python 3.10.5
Node.js v16.14.0
エラー: TypeError: 'NoneType' object is not subscriptable
操作: python scheduler.py output/batch_0001.txt --post
OS: macOS 13.4
```

