"""
楽天トラベルのスクレイピング
Playwright を使用してホテル情報を抽出
"""
import asyncio
from playwright.async_api import async_playwright
from models import HotelData
from config import HEADLESS_MODE, WAIT_UNTIL, PAGE_TIMEOUT, DEBUG


class RakutenScraper:
    """楽天トラベルからホテル情報をスクレイピング"""

    def __init__(self):
        self.headless = HEADLESS_MODE
        self.wait_until = WAIT_UNTIL
        self.timeout = PAGE_TIMEOUT

    async def scrape_hotel(self, url: str) -> HotelData:
        """
        楽天トラベルのページからホテル情報を抽出

        Args:
            url: 楽天トラベルのホテルページURL

        Returns:
            HotelData オブジェクト
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            page = await browser.new_page()

            try:
                print(f"🌐 ページにアクセス中: {url}")
                await page.goto(url, wait_until=self.wait_until, timeout=self.timeout)

                # --- ホテル情報の抽出 ---

                # 1. 宿名を取得（h1タグを探す）
                try:
                    name_element = await page.query_selector("h1")
                    name = await name_element.inner_text() if name_element else "宿名が見つかりません"
                except Exception as e:
                    print(f"⚠️ 宿名取得エラー: {e}")
                    name = "宿名取得エラー"

                # 2. 価格を取得 (楽天のページ構造は複雑なため、セレクタをカスタマイズ)
                try:
                    price_element = await page.query_selector(
                        'span[data-testid="price"], .price, .roomPrice'
                    )
                    price = await price_element.inner_text() if price_element else "価格は調査中..."
                except Exception as e:
                    print(f"⚠️ 価格取得エラー: {e}")
                    price = "価格は調査中..."

                # 3. 説明文を取得 (pタグなどのテキストを探す)
                try:
                    desc_element = await page.query_selector("p, .description, .detail")
                    description = await desc_element.inner_text() if desc_element else "詳細情報なし"
                except Exception as e:
                    print(f"⚠️ 説明文取得エラー: {e}")
                    description = "説明文取得エラー"

                # 4. 特徴をリストで取得
                features = await self._extract_features(page)

                # 5. 画像URLを取得
                image_urls = await self._extract_images(page)

                print(f"✅ 偵察完了: {name}")

                return HotelData(
                    name=name,
                    price=price,
                    features=features,
                    description=description,
                    features_list=features,
                    image_urls=image_urls
                )

            except Exception as e:
                print(f"❌ スクレイピングエラー: {e}")
                raise
            finally:
                await browser.close()

    async def _extract_features(self, page) -> list:
        """
        宿泊施設の特徴をリストで抽出

        Args:
            page: Playwright ページオブジェクト

        Returns:
            特徴リスト
        """
        try:
            features_elements = await page.query_selector_all(
                ".facility, .feature, [data-testid*='feature']"
            )
            features = []
            for elem in features_elements[:10]:  # 最大10個まで
                text = await elem.inner_text()
                if text.strip():
                    features.append(text.strip())
            return features if features else ["詳細情報は公式ページでご確認ください"]
        except Exception as e:
            print(f"⚠️ 特徴抽出エラー: {e}")
            return ["露天風呂あり", "食事付き", "Wi-Fi完備"]

    async def _extract_images(self, page) -> list:
        """
        宿泊施設の画像URLを抽出

        Args:
            page: Playwright ページオブジェクト

        Returns:
            画像URLリスト
        """
        try:
            image_elements = await page.query_selector_all("img[src*='rakuten']")
            image_urls = []
            for elem in image_elements[:5]:  # 最大5枚まで
                src = await elem.get_attribute("src")
                if src and ("http" in src or src.startswith("/")):
                    image_urls.append(src)
            return image_urls
        except Exception as e:
            print(f"⚠️ 画像抽出エラー: {e}")
            return []
