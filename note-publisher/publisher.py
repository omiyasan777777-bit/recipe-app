"""Playwright を使って note.com に記事を投稿する"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright


def _load_config() -> dict:
    base = Path(__file__).parent
    with open(base / "config.json", encoding="utf-8") as f:
        return json.load(f)


# ── ログイン ─────────────────────────────────────────────────────────────────

def _login(page, email: str, password: str):
    print("note.com にログイン中...")
    page.goto("https://note.com/login")
    page.wait_for_load_state("networkidle")

    # メールアドレス入力 → 次へ or パスワードと同一フォームを想定
    email_input = page.locator('input[type="email"], input[name="email"]').first
    email_input.fill(email)

    # 「次へ」ボタンがあれば押す（2ステップログイン対応）
    try:
        next_btn = page.locator('button:has-text("次へ"), button:has-text("ログイン")').first
        next_btn.click()
        page.wait_for_timeout(1000)
    except Exception:
        pass

    # パスワード入力
    pw_input = page.locator('input[type="password"], input[name="password"]').first
    pw_input.wait_for(timeout=10000)
    pw_input.fill(password)

    submit_btn = page.locator('button[type="submit"], button:has-text("ログイン")').first
    submit_btn.click()

    # ログイン後リダイレクト待機
    page.wait_for_url(lambda url: "login" not in url, timeout=20000)
    print("ログイン完了")


# ── 記事投稿 ─────────────────────────────────────────────────────────────────

def _fill_title(page, title: str):
    selectors = [
        '[placeholder="タイトル"]',
        '[data-placeholder="タイトル"]',
        'div[contenteditable="true"]:first-of-type',
        'textarea[name="title"]',
    ]
    for sel in selectors:
        try:
            el = page.locator(sel).first
            el.wait_for(timeout=3000)
            el.click()
            # contenteditable の場合は既存テキストを全選択してから上書き
            page.keyboard.press("Control+a")
            page.keyboard.type(title, delay=30)
            return
        except Exception:
            continue
    raise RuntimeError("タイトル入力欄が見つかりませんでした")


def _fill_body(page, body: str):
    # タイトル欄の次の contenteditable が本文エディタ
    # Tab で移動するか、2番目の contenteditable をクリック
    try:
        page.keyboard.press("Tab")
        page.wait_for_timeout(500)
    except Exception:
        pass

    # クリップボード経由で貼り付け（大量テキストを高速に挿入）
    page.evaluate(
        "(text) => navigator.clipboard.writeText(text).catch(() => {})",
        body,
    )
    page.wait_for_timeout(300)
    page.keyboard.press("Control+a")
    page.keyboard.press("Control+v")
    page.wait_for_timeout(500)


def _set_tags(page, tags: list):
    if not tags:
        return
    try:
        tag_input = page.locator(
            '[placeholder*="タグ"], [placeholder*="ハッシュタグ"], input[name*="tag"]'
        ).first
        tag_input.wait_for(timeout=5000)
        for tag in tags[:5]:  # note は最大5タグ
            tag_input.click()
            tag_input.type(tag, delay=50)
            page.keyboard.press("Enter")
            page.wait_for_timeout(300)
    except Exception as e:
        print(f"  タグ設定スキップ: {e}")


def _publish(page):
    # 「投稿」「公開」ボタンを探してクリック
    candidates = [
        'button:has-text("投稿する")',
        'button:has-text("公開する")',
        'button:has-text("公開設定")',
        'button:has-text("公開")',
        'button:has-text("投稿")',
    ]
    for sel in candidates:
        try:
            btn = page.locator(sel).first
            btn.wait_for(timeout=3000)
            btn.click()
            page.wait_for_timeout(1500)
            break
        except Exception:
            continue

    # モーダル内の確定ボタン（「投稿する」など）
    confirm_candidates = [
        'button:has-text("投稿する")',
        'button:has-text("公開する")',
        'button:has-text("投稿")',
    ]
    for sel in confirm_candidates:
        try:
            btn = page.locator(sel).first
            btn.wait_for(timeout=5000)
            btn.click()
            page.wait_for_timeout(3000)
            return
        except Exception:
            continue


def publish_article(article: dict, config: dict, page):
    print(f"  タイトル: {article['title']}")

    page.goto("https://note.com/notes/new")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    _fill_title(page, article["title"])
    page.wait_for_timeout(500)
    _fill_body(page, article["body"])
    page.wait_for_timeout(500)

    tags = config.get("article", {}).get("tags") or article.get("tags", [])
    _set_tags(page, tags)

    _publish(page)
    print("  投稿完了")


# ── ファイル単位の実行 ────────────────────────────────────────────────────────

def publish_from_file(article_path: str | Path):
    path = Path(article_path)
    with open(path, encoding="utf-8") as f:
        article = json.load(f)

    if article.get("status") == "published":
        print(f"既に投稿済みです: {path.name}")
        return

    config = _load_config()
    note_cfg = config["note"]
    if not note_cfg.get("email") or not note_cfg.get("password"):
        raise ValueError("config.json の note.email と note.password を設定してください")

    browser_cfg = config.get("browser", {})

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=browser_cfg.get("headless", False),
            slow_mo=browser_cfg.get("slow_mo", 80),
        )
        context = browser.new_context()
        page = context.new_page()

        try:
            _login(page, note_cfg["email"], note_cfg["password"])
            publish_article(article, config, page)

            article["status"] = "published"
            article["published_at"] = datetime.now().isoformat()
            with open(path, "w", encoding="utf-8") as f:
                json.dump(article, f, ensure_ascii=False, indent=2)

            # アーカイブへ移動
            archive_dir = path.parent / "archive"
            archive_dir.mkdir(exist_ok=True)
            path.rename(archive_dir / path.name)
            print(f"アーカイブ済み: archive/{path.name}")

        finally:
            browser.close()


def publish_all_pending():
    output_dir = Path(__file__).parent / "output"
    pending = sorted(output_dir.glob("article_*.json"))
    if not pending:
        print("投稿待ちの記事がありません")
        return
    for p in pending:
        publish_from_file(p)


def main():
    if len(sys.argv) < 2:
        print("使い方:")
        print("  python publisher.py output/article_0001.json   # 指定ファイルを投稿")
        print("  python publisher.py --all                       # 未投稿をすべて投稿")
        sys.exit(1)

    if sys.argv[1] == "--all":
        publish_all_pending()
    else:
        publish_from_file(sys.argv[1])


if __name__ == "__main__":
    main()
