# 特典2: Buffer APIセットアップ チェックリスト

> 初期設定でつまずきやすい9つのポイントを先回りして解説するチェックリスト。
> これを見ながら設定すれば、エラーなしで完了できます。

---

## 事前準備

- [ ] Bufferアカウントを作成済み（無料プラン可）
- [ ] Threadアカウントと連携済み（Buffer > チャンネル設定から確認）

---

## チェックポイント 9選

---

### ✅ チェック1: Bufferのプランを確認する

**つまずきポイント**: 無料プランではAPIアクセスが制限される場合があります。

**対処法**:
- Buffer の「設定 > プラン」からプランを確認
- APIを使った自動投稿スケジュールには **Essentials以上のプラン** が推奨
- 無料プランの場合は手動投稿（API経由でキューに追加）のみ可能

```
確認URL: https://buffer.com/pricing
```

---

### ✅ チェック2: APIキー（アクセストークン）を正しく取得する

**つまずきポイント**: アクセストークンの取得場所がわかりにくい。

**対処法**:
1. Buffer Developer Portal にログイン
2. 「My Apps」→「Create an App」
3. アプリ作成後、「Access Token」タブからトークンを取得
4. **トークンは一度しか表示されない** ので必ずメモする

```
Developer Portal: https://developer.buffer.com/
```

> ⚠️ トークンを紛失した場合は再発行が必要。環境変数に保存しておくこと。

---

### ✅ チェック3: 環境変数に APIキーを設定する

**つまずきポイント**: APIキーをコードに直接書いてしまうセキュリティミス。

**対処法**:

```bash
# .env ファイルに記載（Gitにコミットしない！）
BUFFER_ACCESS_TOKEN=your_token_here

# Python での読み込み例
import os
from dotenv import load_dotenv
load_dotenv()
token = os.getenv("BUFFER_ACCESS_TOKEN")
```

```bash
# .gitignore に必ず追加
echo ".env" >> .gitignore
```

---

### ✅ チェック4: プロフィールID（channel_id）を確認する

**つまずきポイント**: 投稿先のSNSアカウントを指定するIDがわからない。

**対処法**:

```python
import requests

headers = {"Authorization": f"Bearer {token}"}
res = requests.get("https://api.bufferapp.com/1/profiles.json", headers=headers)
print(res.json())
# → 各SNSアカウントの "id" フィールドをメモする
```

> ⚠️ ThreadsのプロフィールIDはInstagramと別になっている場合があります。確認必須。

---

### ✅ チェック5: APIリクエストの形式を正しく設定する

**つまずきポイント**: Content-Typeヘッダーの設定ミスで400エラーになる。

**対処法**:

```python
import requests

url = "https://api.bufferapp.com/1/updates/create.json"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/x-www-form-urlencoded"  # ← これが必要
}
data = {
    "text": "投稿テキストをここに",
    "profile_ids[]": "your_profile_id_here",
    "scheduled_at": "2026-04-01T09:00:00+0900"  # ISO 8601形式
}
res = requests.post(url, headers=headers, data=data)
print(res.status_code, res.json())
```

---

### ✅ チェック6: 投稿スケジュールの時刻をUTCで指定する

**つまずきポイント**: 日本時間（JST）で設定するとBuffer側でズレが生じる。

**対処法**:
- Buffer APIのタイムスタンプは **UTC（協定世界時）** が基準
- 日本時間（JST）は UTC+9 のため、**9時間引いた時刻**で指定する

```python
from datetime import datetime, timezone, timedelta

jst = timezone(timedelta(hours=9))
jst_time = datetime(2026, 4, 1, 9, 0, 0, tzinfo=jst)

# UTCに変換して文字列化
utc_time = jst_time.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
# → "2026-04-01T00:00:00Z"
```

---

### ✅ チェック7: レート制限（Rate Limit）を考慮する

**つまずきポイント**: 大量リクエストで429エラー（Too Many Requests）が発生する。

**対処法**:
- Buffer APIのレート制限: 通常 **60リクエスト/分**
- 複数投稿を一括送信する場合は `time.sleep(1)` などで間隔を空ける
- エラー時は **Exponential Backoff（指数バックオフ）** でリトライする

```python
import time

def post_with_retry(url, headers, data, retries=3):
    for i in range(retries):
        res = requests.post(url, headers=headers, data=data)
        if res.status_code == 429:
            wait = 2 ** i  # 1秒 → 2秒 → 4秒
            print(f"Rate limited. Waiting {wait}s...")
            time.sleep(wait)
        else:
            return res
    return None
```

---

### ✅ チェック8: Threads専用の文字数・改行制限を確認する

**つまずきポイント**: Threadsの仕様に合わない投稿文がエラーになる。

**対処法**:

| 項目 | 制限 |
|------|------|
| 最大文字数 | 500文字 |
| 改行 | 使用可能（\n） |
| リンク | 1件のみ推奨 |
| ハッシュタグ | 使用可能（多用注意） |

```python
def validate_threads_post(text):
    if len(text) > 500:
        raise ValueError(f"文字数超過: {len(text)}文字 (上限500文字)")
    return True
```

---

### ✅ チェック9: 投稿が正しくキューに入ったか確認する

**つまずきポイント**: APIレスポンスが200でも実際にキューに反映されていないケースがある。

**対処法**:
- APIレスポンスの `success: true` だけでなく、**Bufferの管理画面でも確認**する
- または、以下のAPIで予約済み投稿一覧を取得して確認する

```python
profile_id = "your_profile_id_here"
url = f"https://api.bufferapp.com/1/profiles/{profile_id}/updates/pending.json"
res = requests.get(url, headers=headers)
pending = res.json()
print(f"キュー内の投稿数: {len(pending.get('updates', []))}")
```

---

## セットアップ完了チェックリスト（最終確認）

- [ ] Buffer プランを確認した
- [ ] APIアクセストークンを取得・保存した
- [ ] `.env` ファイルに環境変数を設定し、`.gitignore` に追加した
- [ ] プロフィールID（channel_id）を確認した
- [ ] テスト投稿のAPIリクエストが成功した（status: 200）
- [ ] Buffer管理画面でキューに投稿が表示されることを確認した
- [ ] 時刻がUTCで正しく設定されている
- [ ] レート制限対策（スリープ・リトライ処理）を実装した
- [ ] Threads文字数バリデーションを実装した

---

## よくあるエラーと対処法

| エラーコード | 原因 | 対処法 |
|------------|------|--------|
| 401 | トークンが無効 | アクセストークンを再発行 |
| 400 | リクエスト形式が不正 | Content-Typeとパラメータを確認 |
| 403 | 権限不足 | プランのアップグレード or 権限確認 |
| 404 | プロフィールIDが間違い | IDを再取得して確認 |
| 429 | レート制限超過 | リクエスト間隔を空けてリトライ |
| 500 | Buffer側のエラー | しばらく待ってから再試行 |
