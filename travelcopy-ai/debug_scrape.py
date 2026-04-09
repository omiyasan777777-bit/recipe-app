"""
デバッグ用スクレイピングツール

ブラウザを目視で確認しながらページ構造を調査できます
"""
import asyncio
from playwright.async_api import async_playwright
from config import PAGE_TIMEOUT


async def debug_scrape(url: str, duration: int = 30):
    """
    デバッグモードでスクレイピング
    ブラウザが表示され、page構造を確認できます

    Args:
        url: テスト対象のURL
        duration: ブラウザを表示する秒数（デフォルト30秒）
    """
    async with async_playwright() as p:
        # headless=False により、ブラウザが表示されます
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        try:
            print(f"🚀 ページにアクセス中: {url}")
            await page.goto(url, wait_until="networkidle", timeout=PAGE_TIMEOUT)

            # ページタイトルを表示
            title = await page.title()
            print(f"✅ ページタイトル: {title}")

            # h1 タグを探す（宿名候補）
            try:
                name = await page.inner_text("h1")
                print(f"🏨 宿名(h1): {name}")
            except Exception as e:
                print(f"❌ 宿名が見つかりません: {e}")

            # すべてのセレクタをリストアップ
            print("\n👀 利用可能なセレクタ:")
            try:
                h1_count = await page.locator("h1").count()
                print(f"  - h1 タグ: {h1_count} 個")

                h2_count = await page.locator("h2").count()
                print(f"  - h2 タグ: {h2_count} 個")

                p_count = await page.locator("p").count()
                print(f"  - p タグ: {p_count} 個")

                span_count = await page.locator("span").count()
                print(f"  - span タグ: {span_count} 個")

                img_count = await page.locator("img").count()
                print(f"  - img タグ: {img_count} 個")

                a_count = await page.locator("a").count()
                print(f"  - a タグ: {a_count} 個")

            except Exception as e:
                print(f"⚠️ セレクタ数取得エラー: {e}")

            print(f"\n⏳ ブラウザが起動しています。{duration}秒後に自動で閉じます...")
            print("💡 ブラウザの開発者ツール（F12）でページ構造を確認できます")

            await asyncio.sleep(duration)

        except Exception as e:
            print(f"❌ エラーが発生しました: {e}")
        finally:
            await browser.close()
            print("✅ ブラウザを閉じました")


if __name__ == "__main__":
    import sys

    # コマンドラインから URL を受け取る
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
        duration = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    else:
        # デフォルトのテスト URL
        test_url = "https://travel.rakuten.co.jp/"
        duration = 30

    asyncio.run(debug_scrape(test_url, duration))
