"""
TravelCopy AI メイン実行スクリプト

楽天トラベルのホテルページからデータを取得し、
AIを使用してブログ記事とSNS投稿を生成します
"""
import asyncio
import sys
from pathlib import Path
from scraper import RakutenScraper
from ai_engine import AIEngine
from config import OUTPUT_DIR


async def main(hotel_url: str = None):
    """
    メイン処理

    Args:
        hotel_url: 楽天トラベルのホテルページURL
                   未指定の場合はコマンドライン入力から取得
    """
    # 出力ディレクトリを作成
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    # URLを取得
    if not hotel_url:
        print("=" * 50)
        print("🚀 TravelCopy AI を起動します...")
        print("=" * 50)
        hotel_url = input(
            "\n楽天トラベルのホテルページURLを入力してください：\n> "
        ).strip()

        if not hotel_url:
            print("❌ URLが入力されていません")
            return

    print(f"\n📍 対象URL: {hotel_url}\n")

    scraper = RakutenScraper()
    ai_engine = AIEngine()

    try:
        # 1. スクレイピング
        print("[1/3] ホテル情報を取得中...")
        hotel_data = await scraper.scrape_hotel(hotel_url)

        # 2. AI生成
        print("[2/3] AIで記事を生成中...")
        results = await ai_engine.generate_all(hotel_data)

        # 3. 結果を表示・保存
        print("[3/3] 結果を保存中...\n")

        # コンソール出力
        print("=" * 60)
        print("✨ 【生成されたブログ記事】 ✨")
        print("=" * 60)
        print(results["blog"])

        print("\n" + "=" * 60)
        print("🐦 【生成されたSNS投稿】 🐦")
        print("=" * 60)
        print(results["sns"])
        print("=" * 60)

        # ファイルに保存
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

        print(f"\n✅ 結果を保存しました: {output_file}")

    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    # コマンドラインから URL が渡された場合は使用する
    hotel_url = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(main(hotel_url))
