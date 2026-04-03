"""
main.py - 生成 → 確認 → 投稿 のメインフロー

使い方:
  # 生成のみ確認（dry-run）
  python main.py

  # テーマ指定
  python main.py --theme "AI開発の面白さ"

  # 実際に投稿
  python main.py --post

  # cron 用（dry-run なしで自動投稿）
  python main.py --post --no-confirm
"""

import argparse
import os
import sys
from pathlib import Path

# .env 読み込み
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv なしでも動作（環境変数を直接設定している場合）

from generate_post import generate_post
from post_to_x import post_to_x


def main():
    parser = argparse.ArgumentParser(description="AI自動投稿（Claude Haiku使用）")
    parser.add_argument("--theme", "-t", default=None, help="投稿のテーマ（省略可）")
    parser.add_argument("--posts", default="my_posts.txt", help="過去投稿ファイル")
    parser.add_argument("--system", default="system_prompt.txt", help="システムプロンプトファイル")
    parser.add_argument("--examples", "-n", type=int, default=5, help="参照する過去投稿数")
    parser.add_argument("--post", action="store_true", help="実際にXへ投稿（省略時はdry-run）")
    parser.add_argument("--no-confirm", action="store_true", help="確認なしで投稿（cron用）")
    args = parser.parse_args()

    # ファイル存在チェック
    script_dir = Path(__file__).parent
    posts_file = script_dir / args.posts
    system_file = script_dir / args.system

    for f in [posts_file, system_file]:
        if not f.exists():
            print(f"[ERROR] ファイルが見つかりません: {f}")
            sys.exit(1)

    print("=== AI投稿生成中（Claude Haiku）===")
    post_text = generate_post(
        posts_file=str(posts_file),
        system_prompt_file=str(system_file),
        theme=args.theme,
        n_examples=args.examples,
    )

    print(f"\n{'='*40}")
    print(post_text)
    print(f"{'='*40}")
    print(f"文字数: {len(post_text)}/280")

    dry_run = not args.post

    # 投稿前に確認（--no-confirm または dry-run 時はスキップ）
    if args.post and not args.no_confirm:
        answer = input("\nこの内容で投稿しますか？ [y/N]: ").strip().lower()
        if answer != "y":
            print("投稿をキャンセルしました。")
            sys.exit(0)

    result = post_to_x(post_text, dry_run=dry_run)

    if dry_run:
        print("\n[ヒント] 実際に投稿するには --post を付けてください")
        print("例: python main.py --post")

    return result


if __name__ == "__main__":
    main()
