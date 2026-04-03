"""
post_to_x.py - X (Twitter) API への投稿

必要な環境変数:
  X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
"""

import os
import tweepy


def post_to_x(text: str, dry_run: bool = True) -> dict:
    """
    Xに投稿する。dry_run=True のときは実際には投稿しない。

    Args:
        text: 投稿文（280文字以内）
        dry_run: True=確認のみ / False=実際に投稿

    Returns:
        {"id": tweet_id, "text": text} または {"dry_run": True, "text": text}
    """
    if len(text) > 280:
        raise ValueError(f"投稿文が280文字を超えています ({len(text)}文字)")

    if dry_run:
        print(f"[DRY RUN] 投稿予定:\n{text}\n({len(text)}文字)")
        return {"dry_run": True, "text": text}

    client = tweepy.Client(
        consumer_key=os.environ["X_API_KEY"],
        consumer_secret=os.environ["X_API_SECRET"],
        access_token=os.environ["X_ACCESS_TOKEN"],
        access_token_secret=os.environ["X_ACCESS_TOKEN_SECRET"],
    )

    response = client.create_tweet(text=text)
    tweet_id = response.data["id"]
    print(f"[投稿完了] ID: {tweet_id}\n{text}")
    return {"id": tweet_id, "text": text}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Xに投稿")
    parser.add_argument("text", help="投稿文")
    parser.add_argument("--post", action="store_true", help="実際に投稿（省略時はdry-run）")
    args = parser.parse_args()

    post_to_x(args.text, dry_run=not args.post)
