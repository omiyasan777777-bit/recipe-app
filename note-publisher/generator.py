"""Claude API を使って note 記事を生成する"""

import json
import sys
from datetime import datetime
from pathlib import Path

import anthropic


def _load_config() -> dict:
    base = Path(__file__).parent
    with open(base / "config.json", encoding="utf-8") as f:
        return json.load(f)


def _load_content() -> tuple[str, str]:
    base = Path(__file__).parent / "content"
    strategy = (base / "strategy.md").read_text(encoding="utf-8") if (base / "strategy.md").exists() else ""
    rules = (base / "rules.md").read_text(encoding="utf-8") if (base / "rules.md").exists() else ""
    return strategy, rules


def generate_article(topic: str = None) -> dict:
    config = _load_config()
    api_key = config["claude"]["api_key"]
    if not api_key or api_key == "YOUR_CLAUDE_API_KEY_HERE":
        raise ValueError("config.json の claude.api_key を設定してください")

    strategy, rules = _load_content()
    client = anthropic.Anthropic(api_key=api_key)

    topic_line = f"\n\n今回のテーマ: {topic}" if topic else ""

    prompt = f"""あなたはnoteのプロライターです。以下の戦略とルールに従って、note記事を1本生成してください。

## ペルソナ・戦略
{strategy or "（content/strategy.md が未設定です）"}

## 記事生成ルール
{rules or "（content/rules.md が未設定です）"}
{topic_line}

---
以下のJSON形式のみで出力してください（コードブロック・前置き・後置き不要）：

{{
  "title": "記事タイトル",
  "body": "記事本文（改行・見出しあり）",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "summary": "一言要約"
}}

body は 1500〜4000字程度、読者を引き込む構成にしてください。
"""

    message = client.messages.create(
        model=config["claude"]["model"],
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    # 余分なテキストがある場合は JSON 部分だけ抜き出す
    start = text.find("{")
    end = text.rfind("}") + 1
    article = json.loads(text[start:end])
    article["generated_at"] = datetime.now().isoformat()
    article["status"] = "pending"
    return article


def save_article(article: dict) -> Path:
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    existing = sorted(output_dir.glob("article_*.json"))
    next_num = len(existing) + 1
    path = output_dir / f"article_{next_num:04d}.json"

    with open(path, "w", encoding="utf-8") as f:
        json.dump(article, f, ensure_ascii=False, indent=2)

    return path


def main():
    topic = " ".join(sys.argv[1:]) or None
    print("Claude API で記事を生成中...")
    article = generate_article(topic)
    path = save_article(article)
    print(f"保存: {path}")
    print(f"タイトル: {article['title']}")
    print(f"タグ: {', '.join(article.get('tags', []))}")
    print(f"文字数: {len(article['body'])}")


if __name__ == "__main__":
    main()
