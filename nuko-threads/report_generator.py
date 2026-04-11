"""
成約レポート自動生成スクリプト

ASP ダッシュボードの成約データから月別レポートを生成し、
高成約パターンを投稿生成ルール（content/rules.md）に自動反映する
"""

import json
import re
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict


class ReportGenerator:
    """成約レポート生成クラス"""

    def __init__(self, asp_data_path, config_path=None):
        self.asp_data_path = Path(asp_data_path)
        self.config_path = Path(config_path) if config_path else None
        self.data = self._load_asp_data()
        self.config = self._load_config()

    def _load_asp_data(self):
        """ASP ツールのデータを読み込む"""
        try:
            with open(self.asp_data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f'ASP データファイルが見つかりません: {self.asp_data_path}')

    def _load_config(self):
        """config.json を読み込む"""
        if not self.config_path:
            return {}
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

    def generate_monthly_report(self, year_month=None):
        """月別成約レポートを生成

        Args:
            year_month: YYYY-MM 形式の月（省略時は当月）

        Returns:
            dict: レポート情報
        """
        if not year_month:
            now = datetime.now()
            year_month = now.strftime('%Y-%m')

        conversions = [
            c for c in self.data.get('conversions', [])
            if c.get('conversion_timestamp', '').startswith(year_month)
        ]

        if not conversions:
            return {'year_month': year_month, 'conversions': 0, 'message': 'このMonth のデータなし'}

        # 集計
        total_revenue = sum(c.get('amount', 0) for c in conversions)
        total_commission = sum(c.get('commission', 0) for c in conversions)

        # リンク別集計
        link_stats = defaultdict(lambda: {'conversions': 0, 'revenue': 0, 'commission': 0})
        for c in conversions:
            link_id = c.get('link_id', 'unknown')
            link_stats[link_id]['conversions'] += 1
            link_stats[link_id]['revenue'] += c.get('amount', 0)
            link_stats[link_id]['commission'] += c.get('commission', 0)

        # トップリンク（成約数上位5件）
        top_links = sorted(
            [
                {
                    'link_id': link_id,
                    'conversions': stats['conversions'],
                    'revenue': stats['revenue'],
                    'commission': stats['commission']
                }
                for link_id, stats in link_stats.items()
            ],
            key=lambda x: x['conversions'],
            reverse=True
        )[:5]

        # タグ別集計（links.json から）
        tag_stats = defaultdict(lambda: {'conversions': 0, 'revenue': 0})
        links = {l['id']: l for l in self.data.get('links', [])}
        for c in conversions:
            link_id = c.get('link_id', '')
            if link_id in links:
                for tag in links[link_id].get('tags', []):
                    tag_stats[tag]['conversions'] += 1
                    tag_stats[tag]['revenue'] += c.get('amount', 0)

        top_tags = sorted(
            [
                {'tag': tag, 'conversions': stats['conversions'], 'revenue': stats['revenue']}
                for tag, stats in tag_stats.items()
            ],
            key=lambda x: x['conversions'],
            reverse=True
        )[:5]

        return {
            'year_month': year_month,
            'conversions': len(conversions),
            'total_revenue': total_revenue,
            'total_commission': total_commission,
            'average_order_value': total_revenue / len(conversions) if conversions else 0,
            'top_links': top_links,
            'top_tags': top_tags
        }

    def extract_high_conversion_patterns(self):
        """高成約パターンを抽出

        Returns:
            dict: パターン情報
        """
        if len(self.data.get('conversions', [])) < 10:
            return {'message': 'データが不足しています（最低10成約以上必要）'}

        # 投稿別集計
        post_stats = defaultdict(lambda: {'conversions': 0, 'revenue': 0})
        posts = {p['id']: p for p in self.data.get('posts', [])}

        for c in self.data.get('conversions', []):
            post_id = c.get('post_id', '')
            if post_id and post_id in posts:
                post_stats[post_id]['conversions'] += 1
                post_stats[post_id]['revenue'] += c.get('amount', 0)

        # 高成約投稿を特定
        high_conversion_posts = sorted(
            [
                {
                    'post_id': post_id,
                    'content': posts[post_id].get('content', ''),
                    'conversions': stats['conversions'],
                    'revenue': stats['revenue']
                }
                for post_id, stats in post_stats.items()
                if post_id in posts
            ],
            key=lambda x: x['conversions'],
            reverse=True
        )[:3]

        # パターン分析
        patterns = {
            'high_conversion_posts': high_conversion_posts,
            'average_conversions_per_post': (
                sum(p['conversions'] for p in high_conversion_posts) / len(high_conversion_posts)
                if high_conversion_posts else 0
            ),
            'recommendations': [
                '✅ 高成約投稿の特徴を分析して、同様のパターンを増やす',
                '✅ 低成約投稿の原因を特定し、改善または削減する',
                '✅ 時間帯・曜日別に成約率が最高の時間に重点投稿する',
                '✅ 高成約カテゴリの投稿本数を増やす'
            ]
        }

        return patterns

    def generate_rules_update(self):
        """rules.md に反映するべき更新内容を生成

        Returns:
            str: rules.md に追記するテキスト
        """
        report = self.generate_monthly_report()
        patterns = self.extract_high_conversion_patterns()

        if 'message' in report or 'message' in patterns:
            return '# 成約データが不足しているため、レポート生成ができません\n'

        update_text = f"""
## 最新成約レポート（{report['year_month']}）

### 成約実績
- **成約数**: {report['conversions']}件
- **売上**: ¥{report['total_revenue']:,}
- **報酬**: ¥{report['total_commission']:,}
- **平均注文金額**: ¥{report['average_order_value']:.0f}

### トップ成約リンク
"""
        for i, link in enumerate(report['top_links'][:3], 1):
            update_text += f"- {i}位: {link['link_id']}（{link['conversions']}件、¥{link['revenue']:,}）\n"

        update_text += "\n### トップ成約カテゴリ\n"
        for i, tag in enumerate(report['top_tags'][:3], 1):
            update_text += f"- {i}位: {tag['tag']}（{tag['conversions']}件、¥{tag['revenue']:,}）\n"

        update_text += "\n### 推奨対策\n"
        for rec in patterns.get('recommendations', []):
            update_text += f"{rec}\n"

        return update_text

    def save_monthly_report(self, output_path=None):
        """月別レポートをファイルに保存

        Args:
            output_path: 出力ファイルパス

        Returns:
            str: 保存されたファイルパス
        """
        if not output_path:
            output_path = self.asp_data_path.parent / 'reports' / f"report_{datetime.now().strftime('%Y%m')}.json"

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        report = self.generate_monthly_report()
        patterns = self.extract_high_conversion_patterns()

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({'report': report, 'patterns': patterns}, f, ensure_ascii=False, indent=2)

        return str(output_path)

    def update_rules_file(self, rules_path):
        """rules.md ファイルを自動更新

        Args:
            rules_path: content/rules.md のパス
        """
        if not Path(rules_path).exists():
            raise FileNotFoundError(f'Rules ファイルが見つかりません: {rules_path}')

        update_text = self.generate_rules_update()

        # 既存ファイルを読む
        with open(rules_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 既存の成約レポートセクションを削除
        content = re.sub(
            r'## 最新成約レポート.*?(?=\n## |\Z)',
            '',
            content,
            flags=re.DOTALL
        )

        # 新しいレポートを追加
        updated_content = content + '\n' + update_text

        with open(rules_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        return True


def main():
    import sys
    import argparse

    parser = argparse.ArgumentParser(description='成約レポート自動生成')
    parser.add_argument('--asp-data', help='ASP データファイルパス', default='../asp-affiliate-tool/data.json')
    parser.add_argument('--config', help='config.json パス', default='config.json')
    parser.add_argument('--month', help='対象月（YYYY-MM）')
    parser.add_argument('--save', help='レポートを保存', action='store_true')
    parser.add_argument('--update-rules', help='rules.md を更新', action='store_true')
    parser.add_argument('--rules-path', help='content/rules.md パス', default='content/rules.md')
    args = parser.parse_args()

    try:
        gen = ReportGenerator(args.asp_data, args.config)

        if args.update_rules:
            gen.update_rules_file(args.rules_path)
            print('✅ content/rules.md を更新しました', file=sys.stderr)
        else:
            report = gen.generate_monthly_report(args.month)
            print(f'\n=== 成約レポート（{report.get("year_month")}）===\n')
            print(f'成約数: {report.get("conversions", 0)}件')
            print(f'売上: ¥{report.get("total_revenue", 0):,}')
            print(f'報酬: ¥{report.get("total_commission", 0):,}')
            print(f'平均注文金額: ¥{report.get("average_order_value", 0):.0f}')

            if args.save:
                saved = gen.save_monthly_report()
                print(f'\n✅ レポートを保存しました: {saved}')

    except Exception as e:
        print(f'❌ エラー: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
