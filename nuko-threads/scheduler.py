"""投稿ファイルをスケジュール付きTSVに変換するスクリプト

使い方:
  python scheduler.py output/batch_0001.txt --clipboard
  python scheduler.py output/batch_0001.txt output/batch_0002.txt -o schedule.tsv
  python scheduler.py output/batch_0001.txt --start-date 2026-04-01
  python scheduler.py output/batch_0001.txt --post  # ASP連携して直接スプシ転記
"""
import json
import random
import re
import sys
import argparse
from pathlib import Path
from datetime import datetime, timedelta

try:
    from asp_integration import ASPIntegration, generate_post_id
except ImportError:
    # asp_integration がない場合は無視
    ASPIntegration = None


def extract_posts(text: str) -> list:
    """投稿テキストからポストを抽出する

    フォーマット:
      [投稿]
      （本文）
      ==========

    スレッド:
      [投稿]
      ■1
      （1つ目）
      ■2
      （2つ目）
      ==========
    """
    posts = []
    segments = re.split(r'={5,}', text)
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        if seg.startswith('[投稿]'):
            seg = seg[len('[投稿]'):].strip()
        if not seg:
            continue

        # スレッド判定: ■N または ■CTA で分割
        parts = re.split(r'■(?:\d+|CTA)\s*', seg)
        items = [p.strip() for p in parts if p.strip()]

        if len(items) > 1:
            posts.append({"thread": True, "items": items})
        else:
            posts.append({"thread": False, "items": [seg]})
    return posts


def create_schedule(posts, config, links, asp_integration=None):
    """投稿リストにスケジュールを付与してTSV行を生成する

    Args:
        posts: 投稿リスト
        config: 設定辞書
        links: links.json のリンク情報
        asp_integration: ASP連携インスタンス（省略時は無効化）
    """
    sch = config.get('schedule', {})
    start_date = datetime.strptime(sch.get('start_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d')
    use_random = sch.get('random_minutes', True)
    use_asp_links = asp_integration is not None and asp_integration.enabled
    use_links = sch.get('links_enabled', False) or use_asp_links
    max_links = sch.get('links_per_day', 2) if use_links else 0
    delay_lo = sch.get('link_delay_min', 30)
    delay_hi = sch.get('link_delay_max', 60)

    hours = sch.get('posting_hours', None)

    # タイムスロット生成
    if hours:
        slots = []
        day = start_date
        while len(slots) < len(posts):
            for h in hours:
                m = random.randint(0, 15) if use_random else 0
                slots.append(day.replace(hour=h, minute=m))
                if len(slots) >= len(posts):
                    break
            day += timedelta(days=1)
    else:
        interval = sch.get('interval', 180)
        t = start_date.replace(hour=sch.get('start_hour', 9),
                               minute=random.randint(0, 15) if use_random else 0)
        slots = []
        for _ in posts:
            slots.append(t)
            t += timedelta(minutes=interval)
            if use_random:
                t = t.replace(minute=random.randint(0, 59))

    cur_day = None
    link_count = 0
    seq = 1
    rows = []
    batch_num = 1  # バッチ番号

    for post_idx, (post, slot) in enumerate(zip(posts, slots)):
        if slot.date() != cur_day:
            cur_day = slot.date()
            link_count = 0

        # 投稿ID を生成
        post_id = generate_post_id(batch_num, post_idx + 1) if 'generate_post_id' in dir() else f'post_{post_idx + 1:03d}'

        d = slot.strftime('%Y/%m/%d')
        h = str(slot.hour)
        m = str(slot.minute)

        post_type = 'スレッド' if post['thread'] else '単体'
        for item in post['items']:
            cell = item.strip()
            escaped = cell.replace('"', '""')
            char_count = len(item.strip())
            rows.append(f'{seq}\t"{escaped}"\t{post_type}\t{d}\t{h}\t{m}\t{char_count}\t下書き\t{post_id}')

        # リンク挿入
        if link_count < max_links:
            link = None

            # ASP連携リンクを優先取得
            if use_asp_links and asp_integration:
                asp_links = asp_integration.get_available_links(
                    campaign_id=asp_integration.asp_config.get('link_campaign'),
                    count=1
                )
                if asp_links:
                    link = asp_links[0]
                    # 成約追跡用にリンクを加工
                    link = asp_integration.create_tracking_link(link, post_id)

            # フォールバック: links.json から取得
            if not link and links:
                link = random.choice(links)

            if link:
                lt = slot + timedelta(minutes=random.randint(delay_lo, delay_hi))
                # リンク情報を tsv に追加
                if 'short_url' in link:
                    body = f'{link.get("title", "詳しくはこちら")}\n{link["short_url"]}'.replace('"', '""')
                else:
                    body = f'{link.get("text", "詳しくはこちら")}\n{link.get("url", "")}'.replace('"', '""')

                char_count = len(body)
                link_id = link.get('id', '') or link.get('link_id', '')
                rows.append(
                    f'{seq}\t"{body}"\tスレッド\t{lt.strftime("%Y/%m/%d")}\t{lt.hour}\t{lt.minute}\t{char_count}\t下書き\t{post_id}_cta\t{link_id}'
                )
                link_count += 1

        seq += 1

    return '\n'.join(rows)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

    parser = argparse.ArgumentParser(description='投稿ファイルをスケジュール付きTSVに変換')
    parser.add_argument('files', nargs='+', help='batch_XXXX.txt ファイル')
    parser.add_argument('-d', '--start-date', help='開始日 (YYYY-MM-DD)')
    parser.add_argument('--start-hour', type=int, help='開始時 (0-23)')
    parser.add_argument('-c', '--clipboard', action='store_true', help='クリップボードにコピー')
    parser.add_argument('-o', '--output', help='出力ファイルパス')
    parser.add_argument('-p', '--post', action='store_true', help='Web App経由でスプシに直接転記')
    parser.add_argument('--clear', action='store_true', help='転記前にデータ消去+書式リセット')
    parser.add_argument('--no-links', action='store_true', help='リンク挿入OFF')
    args = parser.parse_args()

    base = Path(__file__).parent
    with open(base / 'config.json', encoding='utf-8') as f:
        config = json.load(f)
    with open(base / 'links.json', encoding='utf-8') as f:
        links = json.load(f)

    # ASP 連携を初期化
    asp_integration = None
    asp_config = config.get('asp_affiliate_tool', {})
    if asp_config.get('enabled', False) and ASPIntegration:
        try:
            asp_integration = ASPIntegration(asp_config, config_dir=base)
            print(f'✅ ASP連携が有効化されています', file=sys.stderr)
        except Exception as e:
            print(f'⚠️ ASP連携の初期化に失敗: {e}', file=sys.stderr)
            asp_integration = None

    if args.start_date:
        config['schedule']['start_date'] = args.start_date
    if args.start_hour is not None:
        config['schedule']['start_hour'] = args.start_hour
    if args.no_links:
        config['schedule']['links_enabled'] = False

    # 全ファイルを結合
    combined = ''
    for fp in args.files:
        with open(fp, encoding='utf-8') as f:
            combined += f.read() + '\n'

    posts = extract_posts(combined)
    tsv = create_schedule(posts, config, links, asp_integration=asp_integration)

    if args.post:
        webapp_url = config.get('webapp_url', '')
        if not webapp_url:
            print('エラー: config.json の webapp_url が未設定です', file=sys.stderr)
            sys.exit(1)
        webapp_key = config.get('webapp_key', '')
        import urllib.request
        # 消去+書式リセット
        if args.clear:
            payload = {"action": "clear"}
            if webapp_key:
                payload["key"] = webapp_key
            req = urllib.request.Request(
                webapp_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                print(f'消去: {result.get("message", "OK")}', file=sys.stderr)
        # TSV送信
        payload = {"tsv": tsv}
        if webapp_key:
            payload["key"] = webapp_key
        req = urllib.request.Request(
            webapp_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            print(f'{result.get("message", "OK")}', file=sys.stderr)
    elif args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(tsv)
        print(f'{len(posts)}件 → {args.output}', file=sys.stderr)
    elif args.clipboard:
        try:
            import pyperclip
            pyperclip.copy(tsv)
            print(f'{len(posts)}件をクリップボードにコピーしました', file=sys.stderr)
        except ImportError:
            print('pyperclip が必要です: pip install pyperclip', file=sys.stderr)
            sys.exit(1)
    else:
        print(tsv)


if __name__ == '__main__':
    main()
