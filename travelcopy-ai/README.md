# TravelCopy AI

旅行宿泊施設（楽天トラベル）のデータを自動取得し、AIで高品質なブログ記事とSNS投稿を生成するツール。

**機能:**
- 🌐 楽天トラベルからホテル情報を自動スクレイピング
- ✍️ AIで月商100万円レベルのセールスコピーを生成
- 📝 ブログ記事とSNS投稿を自動作成
- 🏃 フロー全体を完全自動化

---

## セットアップ

### 1. 依存パッケージのインストール

```bash
pip install -r requirements.txt
```

### 2. Playwright ブラウザドライバのインストール

```bash
playwright install
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集して、使用するAIエンジンを設定：

**Ollama（ローカルモデル）を使う場合:**
```
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_API_KEY=ollama
OLLAMA_MODEL=llama3
```

**OpenAI を使う場合:**
```
OPENAI_API_KEY=sk-...
```

---

## 使用方法

### 基本的な実行

```bash
python main.py
```

実行すると、楽天トラベルのホテルページURLを入力するよう促されます：

```
楽天トラベルのホテルページURLを入力してください：
> https://travel.rakuten.co.jp/hotel/12345/
```

### コマンドラインから直接URLを指定

```bash
python main.py "https://travel.rakuten.co.jp/hotel/12345/"
```

### 出力結果

生成結果は以下の場所に保存されます：
- **コンソール表示**: ブログ記事とSNS投稿が表示される
- **ファイル保存**: `./output/{宿名}_output.txt`

---

## トラブルシューティング

### Ollama が起動していない場合

```bash
# Ollama を起動
ollama serve

# 別ターミナルで、モデルを実行
ollama run llama3
```

### ページが読み込めない場合

デバッグモードで調査：

```bash
python debug_scrape.py "https://travel.rakuten.co.jp/hotel/12345/" 60
```

- ブラウザが表示され、60秒間保持されます
- 開発者ツール（F12）でページ構造を確認できます

### OpenAI API のレート制限

OpenAI を使用している場合、以下の環境変数で制御可能：

```bash
AI_TEMPERATURE=0.5      # 生成のランダム性（0-1）
AI_MAX_TOKENS=1500      # 最大生成トークン数
```

---

## ファイル構成

```
travelcopy-ai/
├── main.py              # メイン実行スクリプト
├── models.py            # Pydanticモデル定義
├── config.py            # 設定・環境変数管理
├── scraper.py           # Playwriteスクレイピングエンジン
├── ai_engine.py         # AI生成エンジン
├── debug_scrape.py      # デバッグ用スクレイピングツール
├── requirements.txt     # 依存パッケージ
├── .env.example         # 環境変数テンプレート
├── .env                 # 環境変数（.gitignore推奨）
├── output/              # 生成結果の保存先
└── README.md            # このファイル
```

---

## 仕組み

### 処理フロー

```
1. スクレイピング（RakutenScraper）
   楽天トラベルのHTMLから以下を抽出：
   - 宿名
   - 価格
   - 特徴（露天風呂、Wi-Fi等）
   - 説明文
   - 画像URL

2. AI生成（AIEngine）
   - システムプロンプト: 月商100万のプロライター設定
   - ユーザープロンプト: 抽出したホテルデータ
   - 出力: ブログ記事（1000字〜）+ SNS投稿（180字以内）

3. ファイル保存
   - コンソール表示
   - テキストファイルに保存
```

### AI プロンプト設計

生成ルール（`ai_engine.py` の `system_prompt` より）：

1. **ターゲットの悩みを特定** → ストレス、日常の単調さなど
2. **スペック → ベネフィット変換** → 露天風呂 = 思考がほどける時間
3. **五感を言語化** → 湯気、肌の感覚、水音など
4. **希少性・今予約すべき理由を自然に混ぜる**

コンプライアンス：
- 薬機法・景表法の遵守
- 断定的表現（「治る」「最高」）を避ける
- 平易で魅力的な表現を使用

---

## カスタマイズ

### プロンプトの変更

`ai_engine.py` の `system_prompt` をカスタマイズ：

```python
system_prompt = """
あなたは...（カスタム設定）
"""
```

### スクレイピングセレクタの調整

`scraper.py` の `_extract_*` メソッドでセレクタを修正：

```python
# 例：価格セレクタを変更
price_element = await page.query_selector(".custom-price-class")
```

### AI モデルの変更

`config.py` で設定：

```python
OLLAMA_MODEL = "mistral"  # llama3 から mistral に変更
```

---

## ライセンス

MIT License

---

## サポート

問題が発生した場合：

1. **デバッグモード** を実行：`python debug_scrape.py <URL>`
2. **ログを確認**：コンソールの出力メッセージを読む
3. **環境変数を確認**：`.env` ファイルが正しく設定されているか確認
