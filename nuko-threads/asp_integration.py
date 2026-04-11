"""
ASP アフィリエイトツール連携モジュール
投稿にアフィリエイトリンクを自動割り当てし、成約追跡を可能にする
"""

import json
import random
from pathlib import Path
from datetime import datetime
from urllib.parse import urlencode


class ASPIntegration:
    """ASP ツールとの連携を管理するクラス"""

    def __init__(self, asp_config, config_dir=None):
        self.asp_config = asp_config
        self.config_dir = config_dir or Path.cwd()
        self.data = None
        self.enabled = asp_config.get('enabled', False)

        if self.enabled:
            self._load_data()

    def _load_data(self):
        """ASP ツールのデータを読み込む"""
        data_path = self.asp_config.get('data_path', '')

        if not data_path:
            raise ValueError('ASP データパスが設定されていません')

        # 相対パスを絶対パスに変換
        if not Path(data_path).is_absolute():
            # 相対パスの場合は config_dir（nuko-threads）から解決
            abs_path = Path(self.config_dir) / data_path
            data_path = abs_path.resolve()

        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f'ASP データファイルが見つかりません: {data_path}')

    def get_available_links(self, campaign_id=None, count=1):
        """利用可能なアフィリエイトリンクを取得

        Args:
            campaign_id: キャンペーンID（省略時は全リンク対象）
            count: 取得するリンク数

        Returns:
            list: リンク情報のリスト
        """
        if not self.enabled or not self.data:
            return []

        links = self.data.get('links', [])

        # キャンペーンでフィルタ
        if campaign_id:
            links = [l for l in links if l.get('campaign_id') == campaign_id]

        # 有効なリンクのみ抽出
        links = [l for l in links if l.get('id')]

        # ランダムに選択（重複なし）
        if count > len(links):
            count = len(links)

        return random.sample(links, count) if links else []

    def create_tracking_link(self, link, post_id, post_index=0):
        """成約追跡用のパラメータを付けたリンクを生成

        Args:
            link: リンク情報辞書
            post_id: 投稿ID（for 成約追跡）
            post_index: 投稿内のインデックス

        Returns:
            dict: 成約追跡パラメータ付きのリンク情報
        """
        if not link or not link.get('short_url'):
            return link

        tracking_params = {
            'utm_source': 'threads',
            'utm_medium': 'social',
            'utm_campaign': link.get('campaign_id', 'threads'),
            'utm_content': f'post_{post_id}',
            'post_id': post_id,
            'link_id': link.get('id')
        }

        # URL にパラメータを追加
        short_url = link['short_url']
        if '?' not in short_url:
            short_url += '?'
        else:
            short_url += '&'

        tracking_url = short_url + urlencode(tracking_params)

        return {
            **link,
            'short_url': tracking_url,
            'original_short_url': link['short_url'],
            'post_id': post_id,
            'post_index': post_index,
            'assigned_at': datetime.now().isoformat()
        }

    def record_link_usage(self, link, post_id, post_info):
        """リンク使用情報をデータに記録

        Args:
            link: リンク情報
            post_id: 投稿ID
            post_info: 投稿情報（本文、タイプなど）
        """
        if not self.data:
            return

        # 投稿情報を posts に追加
        posts = self.data.get('posts', [])
        posts.append({
            'id': post_id,
            'content': post_info.get('content', '')[:100],  # 最初の100字
            'links_used': [link.get('id')],
            'posted_at': datetime.now().isoformat(),
            'platform': 'Threads',
            'impressions': 0,
            'clicks': 0,
            'conversions': 0,
            'revenue': 0
        })

        self.data['posts'] = posts

    def get_optimization_insights(self):
        """成約最適化のインサイトを取得

        Returns:
            dict: 最適化提案
        """
        if not self.data or len(self.data.get('conversions', [])) < 10:
            return {}

        # 簡易実装：時間帯別の成約率を計算
        hourly_stats = {}
        for conv in self.data.get('conversions', []):
            hour = datetime.fromisoformat(conv.get('conversion_timestamp', '2026-04-11T09:00:00Z')).hour
            if hour not in hourly_stats:
                hourly_stats[hour] = {'conversions': 0, 'clicks': 0}
            hourly_stats[hour]['conversions'] += 1

        # 最適な投稿時間を特定
        best_hour = max(hourly_stats.items(), key=lambda x: x[1]['conversions'], default=(9, {}))[0]

        return {
            'best_posting_hour': best_hour,
            'best_posting_time': f'{best_hour:02d}:00',
            'insights': f'午前{best_hour}時が最適な投稿時間です'
        }

    def update_posting_hours(self, config):
        """成約データに基づいて最適な投稿時間を推奨

        Args:
            config: config.json の schedule セクション

        Returns:
            list: 推奨投稿時間
        """
        insights = self.get_optimization_insights()
        if not insights:
            return config.get('posting_hours', [7, 9, 12, 15, 19, 21])

        best_hour = insights.get('best_posting_hour')
        if best_hour:
            # 現在の投稿時間をキープしつつ、最適時間を優先度上げ
            current_hours = config.get('posting_hours', [7, 9, 12, 15, 19, 21])
            if best_hour not in current_hours:
                current_hours.insert(0, best_hour)
            return current_hours

        return config.get('posting_hours', [7, 9, 12, 15, 19, 21])


def generate_post_id(batch_num, post_num):
    """投稿IDを生成

    Args:
        batch_num: バッチ番号
        post_num: バッチ内の投稿番号

    Returns:
        str: 投稿ID（例：post_0001_001）
    """
    return f'post_{batch_num:04d}_{post_num:03d}'


def inject_link_into_tsv(tsv_row, link, post_id):
    """TSV行にリンク情報を注入

    Args:
        tsv_row: TSV行
        link: リンク情報
        post_id: 投稿ID

    Returns:
        str: リンク情報が追加されたTSV行
    """
    if not link:
        return tsv_row

    # リンク情報を「メタデータ」カラムとして追加
    link_info = f"link_id:{link.get('id')}|url:{link.get('short_url')}"
    parts = tsv_row.split('\t')

    # 最後に リンク情報カラムを追加
    if len(parts) >= 8:
        parts.append(link_info)

    return '\t'.join(parts)
