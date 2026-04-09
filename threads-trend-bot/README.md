# 🔥 Threads Trend Bot

Threads のトレンドを自動で収集し、GitHub Pages でリアルタイムに表示する完全自動システム。

## 📊 機能

- **自動トレンド収集**: GitHub Actions が 6 時間ごとに自動実行
- **リアルタイムダッシュボード**: trends.json をブラウザで可視化
- **サーバー代 0 円**: GitHub Pages でホスティング
- **パソコン不要**: ブラウザだけで完結

## 🚀 セットアップ

### ステップ 1: Workflow 権限を設定

リポジトリの Settings → Actions → General にアクセス

**Workflow permissions** を「Read and write permissions」に変更

### ステップ 2: GitHub Pages を有効化

リポジトリの Settings → Pages にアクセス

- **Build and deployment** → **Branch**: `claude/github-trend-site-xYs9N`
- **Folder**: `/ (root)`

**Save** をクリック

### ステップ 3: 最初の実行をテスト

リポジトリの **Actions** タブ → 左から **Threads Trend Scraper** を選択

**Run workflow** → **Run workflow** をクリック

緑の ✅ チェックマークが付いたら成功です。

### ステップ 4: ダッシュボードにアクセス

GitHub Pages の URL が表示されたら、そのリンクをクリック

```
https://username.github.io/repository-name/threads-trend-bot/
```

## 📁 ファイル構成

```
threads-trend-bot/
├── scraper.py          # トレンド収集スクリプト
├── requirements.txt    # Python ライブラリ
├── trends.json         # トレンドデータ（自動更新）
├── index.html          # ダッシュボード
└── README.md          # このファイル
```

## ⚙️ 動作原理

1. **GitHub Actions** が 6 時間ごとに自動実行
2. **scraper.py** が Threads からトレンド情報を収集
3. **trends.json** に結果を保存
4. **GitHub** が新しいコミットを自動プッシュ
5. **GitHub Pages** が trends.json を読み込み、index.html で表示

## 🔧 カスタマイズ

### 実行間隔を変更

`.github/workflows/scrape-threads-trend.yml` の `cron` を編集：

```yaml
schedule:
  - cron: '0 */12 * * *'  # 12時間ごとに実行
```

### トレンド項目を追加

`scraper.py` の `extract_trends()` 関数を編集

### ダッシュボードのデザイン変更

`index.html` の `<style>` セクションを編集

## 📈 スケール

このシステムは以下のような拡張が可能：

- 複数のプラットフォーム（X/Twitter、Instagram等）に対応
- データベースへの保存
- メール通知の追加
- Slack 連携

## ⚠️ 注意事項

- **初回実行**: Workflow の初回実行には数分かかる場合があります
- **トレンドデータ**: 初回は mock データが表示されます（実際の Threads API 連携は別途設定が必要）
- **更新頻度**: 6 時間ごとが推奨（高頻度にするとクォータを消費する可能性）

## 🤝 トラブルシューティング

### Workflow が実行されない

→ Settings → Actions → Permissions で「Read and write permissions」になっているか確認

### ダッシュボードが表示されない

→ GitHub Pages が正しく設定されているか Settings → Pages を確認

### trends.json が更新されない

→ Actions タブで Workflow のログを確認して エラーメッセージを見る

## 📚 参考

- [GitHub Actions ドキュメント](https://docs.github.com/actions)
- [GitHub Pages ドキュメント](https://docs.github.com/pages)

---

**made with ❤️ using GitHub Actions + Pages**
