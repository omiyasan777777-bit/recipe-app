"""
generate_post.py - Claude APIでXの投稿文を生成（トークン最小化版）

トークン削減戦略:
  1. claude-haiku-4-5 使用（最安値: $1/$5 per 1M tokens）
  2. system prompt に cache_control でキャッシュ（2回目以降 ~90% 削減）
  3. 過去投稿からランダム5件のみサンプリング
  4. max_tokens=100（280文字以内 ≈ 70〜90トークン）
"""

import anthropic
import random
import os
from pathlib import Path


def load_sample_posts(posts_file: str, n: int = 5) -> str:
    """過去投稿ファイルからランダムにN件取得"""
    text = Path(posts_file).read_text(encoding="utf-8").strip()
    # 空行2つで投稿を区切る（1行でも可）
    posts = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not posts:
        # 1行1投稿形式にもフォールバック
        posts = [p.strip() for p in text.split("\n") if p.strip()]
    sample = random.sample(posts, min(n, len(posts)))
    return "\n---\n".join(sample)


def load_system_prompt(prompt_file: str) -> str:
    return Path(prompt_file).read_text(encoding="utf-8").strip()


def generate_post(
    posts_file: str = "my_posts.txt",
    system_prompt_file: str = "system_prompt.txt",
    theme: str = None,
    n_examples: int = 5,
) -> str:
    """
    Claude Haiku でXの投稿を1件生成する。

    Returns:
        生成された投稿文（280文字以内）
    """
    client = anthropic.Anthropic()

    system_text = load_system_prompt(system_prompt_file)
    sample_posts = load_sample_posts(posts_file, n=n_examples)

    # ユーザープロンプト（毎回変わる部分 → キャッシュ対象外）
    user_parts = [
        "【過去の投稿例】",
        sample_posts,
        "",
        "上記の文体・口調・思考パターンを忠実に再現し、新しい投稿を1つ書いてください。",
        "条件: 280文字以内 / ハッシュタグ不要 / 投稿本文のみ出力（説明文・引用符不要）",
    ]
    if theme:
        user_parts.insert(-1, f"今回のテーマ: {theme}")

    user_content = "\n".join(user_parts)

    # API呼び出し（Haiku + プロンプトキャッシュ）
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=100,  # 280文字 ≈ 最大100トークン
        system=[
            {
                "type": "text",
                "text": system_text,
                # システムプロンプトをキャッシュ（5分間有効）
                # 2回目以降: cache_read_input_tokens が増えコスト ~90% 減
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_content}],
    )

    # トークン使用量をログ出力（コスト監視用）
    u = response.usage
    cache_read = getattr(u, "cache_read_input_tokens", 0)
    cache_write = getattr(u, "cache_creation_input_tokens", 0)
    saved = cache_read  # キャッシュで節約したトークン数
    print(
        f"[tokens] input={u.input_tokens} output={u.output_tokens} "
        f"cache_write={cache_write} cache_read={cache_read} "
        f"(saved ~{saved} tokens)"
    )

    return response.content[0].text.strip()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Claude Haiku でXの投稿を生成")
    parser.add_argument("--theme", "-t", default=None, help="投稿のテーマ（省略可）")
    parser.add_argument("--posts", default="my_posts.txt", help="過去投稿ファイル")
    parser.add_argument("--system", default="system_prompt.txt", help="システムプロンプトファイル")
    parser.add_argument("--examples", "-n", type=int, default=5, help="参照する過去投稿数（デフォルト: 5）")
    args = parser.parse_args()

    post = generate_post(
        posts_file=args.posts,
        system_prompt_file=args.system,
        theme=args.theme,
        n_examples=args.examples,
    )
    print(f"\n{'='*40}")
    print(post)
    print(f"{'='*40}")
    print(f"文字数: {len(post)}")
