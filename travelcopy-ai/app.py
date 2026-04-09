"""
TravelCopy AI - Web UI版
Flask ベースのブラウザインターフェース
"""
import asyncio
import os
from pathlib import Path
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from scraper import RakutenScraper
from ai_engine import AIEngine
from config import OUTPUT_DIR

app = Flask(__name__)
CORS(app)

# 出力ディレクトリを作成
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)


@app.route('/')
def index():
    """メインページ"""
    return render_template('index.html')


@app.route('/api/generate', methods=['POST'])
def generate():
    """AI生成API"""
    data = request.get_json()
    hotel_url = data.get('url', '').strip()

    if not hotel_url:
        return jsonify({'error': 'URLを入力してください'}), 400

    if not hotel_url.startswith('http'):
        return jsonify({'error': '有効なURLを入力してください'}), 400

    try:
        # 非同期処理を実行
        result = asyncio.run(generate_content(hotel_url))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


async def generate_content(hotel_url: str) -> dict:
    """ホテル情報を取得してAIで生成"""
    scraper = RakutenScraper()
    ai_engine = AIEngine()

    # 1. スクレイピング
    hotel_data = await scraper.scrape_hotel(hotel_url)

    # 2. AI生成
    results = await ai_engine.generate_all(hotel_data)

    # 3. ファイルに保存
    output_file = Path(OUTPUT_DIR) / f"{hotel_data.name}_output.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"宿泊施設: {hotel_data.name}\n")
        f.write(f"URL: {hotel_url}\n")
        f.write(f"価格: {hotel_data.price}\n")
        f.write(f"特徴: {', '.join(hotel_data.features)}\n")
        f.write("\n" + "=" * 60 + "\n")
        f.write("【ブログ記事】\n" + "=" * 60 + "\n")
        f.write(results["blog"])
        f.write("\n\n" + "=" * 60 + "\n")
        f.write("【SNS投稿】\n" + "=" * 60 + "\n")
        f.write(results["sns"])

    return {
        'hotel_name': hotel_data.name,
        'price': hotel_data.price,
        'features': hotel_data.features,
        'blog': results['blog'],
        'sns': results['sns'],
        'saved_file': str(output_file)
    }


@app.route('/health')
def health():
    """ヘルスチェック"""
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    print("""
╔════════════════════════════════════════╗
║     TravelCopy AI - Web Version        ║
╚════════════════════════════════════════╝

🌐 ブラウザで開いてください：
   http://localhost:5000

📝 ホテルのURLを入力して、「生成」をクリック！
    """)
    app.run(debug=True, host='localhost', port=5000)
