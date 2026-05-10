"""note 記事の生成・投稿を統合実行するエントリーポイント

使い方:
  python run.py generate              # 記事を生成して output/ に保存
  python run.py generate "テーマ名"  # テーマ指定で生成
  python run.py publish article_0001.json  # 指定ファイルを投稿
  python run.py publish --all         # 未投稿をすべて投稿
  python run.py auto                  # 生成 → 即投稿
  python run.py auto "テーマ名"      # テーマ指定で生成 → 即投稿
"""

import sys
from pathlib import Path

from generator import generate_article, save_article
from publisher import publish_all_pending, publish_from_file


def cmd_generate(topic: str = None):
    print("=== 記事生成 ===")
    print("Claude API で記事を生成中...")
    article = generate_article(topic)
    path = save_article(article)
    print(f"\n保存先: {path}")
    print(f"タイトル: {article['title']}")
    print(f"タグ: {', '.join(article.get('tags', []))}")
    print(f"文字数: {len(article['body'])}")
    print(f"\n投稿するには: python run.py publish {path.name}")
    return path


def cmd_publish(target: str):
    print("=== 記事投稿 ===")
    if target == "--all":
        publish_all_pending()
    else:
        # ファイル名だけ渡された場合は output/ を補完
        p = Path(target)
        if not p.exists():
            p = Path(__file__).parent / "output" / target
        publish_from_file(p)


def cmd_auto(topic: str = None):
    print("=== 自動実行（生成 → 投稿）===")
    print("Claude API で記事を生成中...")
    article = generate_article(topic)
    path = save_article(article)
    print(f"生成完了: {article['title']}")
    print("\nブラウザで note.com に投稿中...")
    publish_from_file(path)
    print("\n✅ 完了！")


def usage():
    print(__doc__)
    sys.exit(1)


def main():
    args = sys.argv[1:]
    if not args:
        usage()

    cmd = args[0]
    rest = " ".join(args[1:]) if len(args) > 1 else None

    if cmd == "generate":
        cmd_generate(rest)
    elif cmd == "publish":
        if not rest:
            print("エラー: ファイル名または --all を指定してください")
            sys.exit(1)
        cmd_publish(rest)
    elif cmd == "auto":
        cmd_auto(rest)
    else:
        usage()


if __name__ == "__main__":
    main()
