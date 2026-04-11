/**
 * 分析エンジン
 * 成約データの集計・分析・レポート生成
 */

class AnalyticsEngine {
    constructor(data) {
        this.data = data;
    }

    /**
     * 日別成約率を計算
     */
    calculateDailyStats(dateFrom = null, dateTo = null) {
        const stats = {};

        this.data.conversions.forEach(c => {
            const date = c.conversion_timestamp.split('T')[0];

            if (!stats[date]) {
                stats[date] = {
                    date,
                    conversions: 0,
                    clicks: 0,
                    revenue: 0,
                    commission: 0
                };
            }

            stats[date].conversions++;
            stats[date].revenue += c.amount || 0;
            stats[date].commission += c.commission || 0;
        });

        // クリック数を推定（仮定: 3回クリックで1成約）
        Object.values(stats).forEach(stat => {
            stat.clicks = Math.round(stat.conversions * 3);
            stat.conversionRate = ((stat.conversions / stat.clicks) * 100).toFixed(1);
        });

        return Object.values(stats).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * 投稿別成約率を計算
     */
    calculatePostStats() {
        const stats = {};

        this.data.posts.forEach(post => {
            stats[post.id] = {
                postId: post.id,
                content: post.content.substring(0, 50) + '...',
                postedAt: post.posted_at,
                impressions: post.impressions || 0,
                clicks: post.clicks || 0,
                conversions: post.conversions || 0,
                revenue: post.revenue || 0
            };

            if (stats[post.id].clicks > 0) {
                stats[post.id].conversionRate = ((stats[post.id].conversions / stats[post.id].clicks) * 100).toFixed(1);
            } else {
                stats[post.id].conversionRate = 0;
            }
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }

    /**
     * 時間帯別成約率を計算
     */
    calculateHourlyStats() {
        const stats = {};

        // 00-23時の枠を初期化
        for (let i = 0; i < 24; i++) {
            stats[i] = {
                hour: i,
                hourLabel: `${i.toString().padStart(2, '0')}:00`,
                conversions: 0,
                clicks: 0,
                revenue: 0
            };
        }

        this.data.conversions.forEach(c => {
            const hour = new Date(c.click_timestamp).getHours();
            stats[hour].conversions++;
            stats[hour].revenue += c.amount || 0;
        });

        // クリック数を推定
        const totalConversions = this.data.conversions.length;
        Object.values(stats).forEach(stat => {
            stat.clicks = Math.round((totalConversions / 24) * 3);
            stat.conversionRate = stat.clicks > 0
                ? ((stat.conversions / stat.clicks) * 100).toFixed(1)
                : 0;
        });

        return Object.values(stats);
    }

    /**
     * 曜日別成約率を計算
     */
    calculateDayOfWeekStats() {
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const stats = {};

        // 曜日の枠を初期化
        for (let i = 0; i < 7; i++) {
            stats[i] = {
                dayOfWeek: i,
                dayLabel: `${dayNames[i]}曜日`,
                conversions: 0,
                clicks: 0,
                revenue: 0
            };
        }

        this.data.conversions.forEach(c => {
            const date = new Date(c.click_timestamp);
            const dayOfWeek = date.getDay();
            stats[dayOfWeek].conversions++;
            stats[dayOfWeek].revenue += c.amount || 0;
        });

        // クリック数を推定
        const totalConversions = this.data.conversions.length;
        Object.values(stats).forEach(stat => {
            stat.clicks = Math.round((totalConversions / 7) * 3);
            stat.conversionRate = stat.clicks > 0
                ? ((stat.conversions / stat.clicks) * 100).toFixed(1)
                : 0;
        });

        return Object.values(stats);
    }

    /**
     * リンク別成約率を計算
     */
    calculateLinkStats() {
        const stats = {};

        this.data.links.forEach(link => {
            stats[link.id] = {
                linkId: link.id,
                shortUrl: link.short_url,
                title: link.title,
                asp: link.asp,
                tags: link.tags,
                conversions: 0,
                clicks: 0,
                revenue: 0,
                createdAt: link.created_at
            };
        });

        this.data.conversions.forEach(c => {
            if (stats[c.link_id]) {
                stats[c.link_id].conversions++;
                stats[c.link_id].revenue += c.amount || 0;
            }
        });

        // クリック数を推定
        Object.values(stats).forEach(stat => {
            stat.clicks = Math.round((stat.conversions || 0) * 3);
            stat.conversionRate = stat.clicks > 0
                ? ((stat.conversions / stat.clicks) * 100).toFixed(1)
                : 0;
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }

    /**
     * タグ別成約率を計算
     */
    calculateTagStats() {
        const stats = {};

        this.data.links.forEach(link => {
            link.tags.forEach(tag => {
                if (!stats[tag]) {
                    stats[tag] = {
                        tag,
                        conversions: 0,
                        clicks: 0,
                        revenue: 0,
                        linkCount: 0
                    };
                }
                stats[tag].linkCount++;

                // 該当リンクの成約データを加算
                this.data.conversions
                    .filter(c => c.link_id === link.id)
                    .forEach(c => {
                        stats[tag].conversions++;
                        stats[tag].revenue += c.amount || 0;
                    });
            });
        });

        // クリック数を推定
        Object.values(stats).forEach(stat => {
            stat.clicks = Math.round((stat.conversions || 0) * 3);
            stat.conversionRate = stat.clicks > 0
                ? ((stat.conversions / stat.clicks) * 100).toFixed(1)
                : 0;
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }

    /**
     * キャンペーン別成約率を計算
     */
    calculateCampaignStats() {
        const stats = {};

        this.data.links.forEach(link => {
            const campaignId = link.campaign_id || 'uncategorized';

            if (!stats[campaignId]) {
                stats[campaignId] = {
                    campaignId,
                    conversions: 0,
                    clicks: 0,
                    revenue: 0,
                    linkCount: 0
                };
            }
            stats[campaignId].linkCount++;

            // 該当リンクの成約データを加算
            this.data.conversions
                .filter(c => c.link_id === link.id)
                .forEach(c => {
                    stats[campaignId].conversions++;
                    stats[campaignId].revenue += c.amount || 0;
                });
        });

        // クリック数を推定
        Object.values(stats).forEach(stat => {
            stat.clicks = Math.round((stat.conversions || 0) * 3);
            stat.conversionRate = stat.clicks > 0
                ? ((stat.conversions / stat.clicks) * 100).toFixed(1)
                : 0;
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }

    /**
     * 全体成約率の計算
     */
    calculateOverallStats() {
        const conversions = this.data.conversions.length;
        const clicks = conversions * 3; // 仮定
        const revenue = this.data.conversions.reduce((sum, c) => sum + (c.amount || 0), 0);
        const commission = this.data.conversions.reduce((sum, c) => sum + (c.commission || 0), 0);

        return {
            conversions,
            clicks,
            conversionRate: ((conversions / clicks) * 100).toFixed(1),
            revenue,
            commission,
            averageOrderValue: conversions > 0 ? (revenue / conversions).toFixed(0) : 0
        };
    }

    /**
     * CLV（Customer Lifetime Value）の推定
     */
    calculateCLV(customerId = null) {
        // 顧客別の成約数・売上を集計
        // 簡易実装: 投稿別のCLVを計算

        const postCLV = {};

        this.data.posts.forEach(post => {
            const conversions = this.data.conversions.filter(c => c.post_id === post.id);
            const revenue = conversions.reduce((sum, c) => sum + (c.amount || 0), 0);
            const clv = conversions.length > 0 ? (revenue / conversions.length) : 0;

            postCLV[post.id] = {
                postId: post.id,
                customerCount: conversions.length,
                totalRevenue: revenue,
                clv: clv.toFixed(0)
            };
        });

        return postCLV;
    }

    /**
     * 期間別レポート生成
     */
    generatePeriodReport(dateFrom, dateTo) {
        const conversions = this.data.conversions.filter(c => {
            const date = c.conversion_timestamp.split('T')[0];
            return date >= dateFrom && date <= dateTo;
        });

        const revenue = conversions.reduce((sum, c) => sum + (c.amount || 0), 0);
        const commission = conversions.reduce((sum, c) => sum + (c.commission || 0), 0);
        const clicks = conversions.length * 3;
        const conversionRate = clicks > 0 ? ((conversions.length / clicks) * 100).toFixed(1) : 0;

        return {
            dateFrom,
            dateTo,
            conversions: conversions.length,
            clicks,
            conversionRate,
            revenue,
            commission,
            averageOrderValue: conversions.length > 0 ? (revenue / conversions.length).toFixed(0) : 0
        };
    }

    /**
     * 成約トレンド分析
     */
    analyzeTrend(days = 30) {
        const dailyStats = this.calculateDailyStats();
        const recent = dailyStats.slice(-days);

        if (recent.length < 2) {
            return { trend: 'insufficient_data', change: 0 };
        }

        const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
        const secondHalf = recent.slice(Math.floor(recent.length / 2));

        const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.conversions, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.conversions, 0) / secondHalf.length;

        const change = (((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100).toFixed(1);

        return {
            trend: secondHalfAvg > firstHalfAvg ? 'up' : 'down',
            change,
            firstHalfAvg: firstHalfAvg.toFixed(1),
            secondHalfAvg: secondHalfAvg.toFixed(1)
        };
    }
}

// グローバルに公開
window.AnalyticsEngine = AnalyticsEngine;
