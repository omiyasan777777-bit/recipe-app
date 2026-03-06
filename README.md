# Bluesky 予約投稿ツール

Bluesky (AT Protocol) に対応した CLI ベースの予約投稿ツールです。
SQLite でスケジュールを管理し、バックグラウンドデーモンが時刻を監視して自動投稿します。

## セットアップ

### 1. 依存パッケージのインストール

```bash
pip install -r requirements.txt
# または
pip install -e .
```

### 2. 認証情報の設定

`.env.example` をコピーして `.env` を作成し、Bluesky の認証情報を入力します。

```bash
cp .env.example .env
```

`.env` を編集:

```
BLUESKY_HANDLE=yourhandle.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

> **アプリパスワード**は Bluesky の設定 → セキュリティ → アプリパスワード から発行できます。

### 3. 認証確認

```bash
python main.py verify
```

## 使い方

### 投稿をスケジュール登録

```bash
python main.py add "こんにちは！予約投稿のテストです。" --at "2026-03-10 15:00"

# タイムゾーン付き (ISO 8601)
python main.py add "Hello from Bluesky!" --at "2026-03-10T15:00:00+09:00"

# 画像付き (最大4枚)
python main.py add "写真シェア！" --at "2026-03-10 12:00" --image ./photo1.jpg --image ./photo2.png
```

### スケジュール一覧表示

```bash
python main.py list

# ステータス絞り込み (pending / posted / failed)
python main.py list --status pending
python main.py list --status posted
```

### 投稿削除

```bash
python main.py delete 3   # ID=3 の投稿を削除
```

### デーモン起動（常駐監視）

```bash
# 60秒ごとに確認 (デフォルト)
python main.py run

# 30秒ごとに確認
python main.py run --interval 30
```

### 期限到来済みの投稿を即時送信

```bash
python main.py send-due
```

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `add TEXT --at DATETIME` | 投稿をスケジュール登録 |
| `list [--status STATUS]` | 登録済み投稿の一覧表示 |
| `delete ID` | 投稿を削除 |
| `run [--interval SECONDS]` | スケジューラーデーモンを起動 |
| `send-due` | 期限到来済み投稿を即時送信 |
| `verify` | 認証情報の確認 |

## データベース

デフォルトでは `~/.bluesky_scheduler/posts.db` に SQLite で保存されます。
`DB_PATH` 環境変数でパスを変更できます。

## 投稿ステータス

| ステータス | 説明 |
|---|---|
| `pending` | 未送信・待機中 |
| `posted` | 送信済み |
| `failed` | 送信失敗（エラーメッセージが記録されます） |
