/**
 * ASP連携モジュール
 * A8.net, afb, Monetrack, Amazon の CSVフォーマット解析
 */

class ASPConnector {
    /**
     * ASP別のCSVフォーマット定義
     */
    static CSV_FORMATS = {
        a8: {
            name: 'A8.net',
            encoding: 'shift_jis',
            skipRows: 2,
            columns: {
                conversion_id: '確定番号',
                amount: '売上金額',
                commission: '成果報酬',
                conversion_date: '確定日',
                product_name: '商品名',
                program_name: 'プログラム名',
                status: '状態'
            },
            dateFormat: 'YYYY-MM-DD'
        },
        afb: {
            name: 'afb',
            encoding: 'utf-8',
            skipRows: 0,
            columns: {
                conversion_id: '成果ID',
                amount: '売上',
                commission: '報酬',
                conversion_date: '確定日',
                product_name: '商品',
                program_name: 'プログラム',
                status: 'ステータス'
            },
            dateFormat: 'YYYY-MM-DD'
        },
        monetrack: {
            name: 'Monetrack',
            encoding: 'utf-8',
            skipRows: 1,
            columns: {
                conversion_id: 'ID',
                amount: '売上額',
                commission: 'コミッション',
                conversion_date: '確定日',
                product_name: 'キャンペーン名',
                program_name: 'プログラム',
                status: 'ステータス'
            },
            dateFormat: 'YYYY/MM/DD'
        },
        amazon: {
            name: 'Amazonアソシエイト',
            encoding: 'utf-8',
            skipRows: 0,
            columns: {
                conversion_id: '注文ID',
                amount: '紹介売上額',
                commission: '紹介手数料',
                conversion_date: '注文日',
                product_name: '商品名',
                status: 'ステータス'
            },
            dateFormat: 'YYYY-MM-DD'
        }
    };

    /**
     * CSVを解析して成約データに変換
     */
    static parseCSV(csvText, asp) {
        const format = this.CSV_FORMATS[asp];
        if (!format) {
            throw new Error(`Unknown ASP: ${asp}`);
        }

        const lines = csvText.split('\n');
        const skipRows = format.skipRows || 0;
        const headerLine = lines[skipRows];
        const headers = headerLine.split(',').map(h => h.trim().replace(/["']/g, ''));

        // ヘッダーのインデックスを取得
        const columnIndexes = {};
        Object.entries(format.columns).forEach(([key, columnName]) => {
            const index = headers.findIndex(h => h.includes(columnName));
            if (index >= 0) {
                columnIndexes[key] = index;
            }
        });

        // データ行を解析
        const conversions = [];
        for (let i = skipRows + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(',').map(v => v.trim().replace(/["']/g, ''));
            const conversion = {
                id: `conv_${asp}_${values[columnIndexes.conversion_id] || Date.now()}`,
                link_id: '',
                post_id: '',
                click_timestamp: new Date().toISOString(),
                conversion_timestamp: this.parseDate(values[columnIndexes.conversion_date], format.dateFormat),
                amount: parseInt(values[columnIndexes.amount]) || 0,
                commission: parseInt(values[columnIndexes.commission]) || 0,
                status: 'confirmed'
            };

            conversions.push(conversion);
        }

        return conversions;
    }

    /**
     * 日付をISO形式に変換
     */
    static parseDate(dateStr, format) {
        if (!dateStr) {
            return new Date().toISOString();
        }

        let date;
        if (format === 'YYYY-MM-DD') {
            date = new Date(dateStr);
        } else if (format === 'YYYY/MM/DD') {
            date = new Date(dateStr.replace(/\//g, '-'));
        } else {
            date = new Date(dateStr);
        }

        return date.toISOString();
    }

    /**
     * CSVのサンプル行を生成（テスト用）
     */
    static generateSampleCSV(asp) {
        const format = this.CSV_FORMATS[asp];

        // ヘッダー行
        const headers = Object.values(format.columns);
        let csv = headers.join(',') + '\n';

        // サンプルデータ行（5件）
        for (let i = 0; i < 5; i++) {
            const row = [
                `${asp}-${Date.now()}-${i}`, // ID
                (1000 + i * 500).toString(),  // 売上
                (100 + i * 50).toString(),    // 報酬
                new Date().toISOString().split('T')[0], // 確定日
                `商品${i + 1}`,
                'テストプログラム',
                '確定'
            ];
            csv += row.join(',') + '\n';
        }

        return csv;
    }

    /**
     * CSV URL の短縮リンクを生成
     */
    static generateAffiliateShortUrl(originalUrl, campaign, linkId) {
        // UTMパラメータを付与
        const utm = new URLSearchParams({
            utm_source: 'threads',
            utm_medium: 'social',
            utm_campaign: campaign,
            utm_content: linkId
        });

        return `thr.link/${linkId}?${utm.toString()}`;
    }

    /**
     * ASP設定の検証
     */
    static validateASPConfig(config, asp) {
        const aspConfig = config.asp[asp];

        if (!aspConfig) {
            return { valid: false, error: `ASP "${asp}" is not configured` };
        }

        if (!aspConfig.enabled) {
            return { valid: false, error: `ASP "${asp}" is disabled` };
        }

        if (aspConfig.api_type === 'csv' && !aspConfig.csv_folder) {
            return { valid: true, warning: `CSV folder for ${asp} is not set. Manual import required.` };
        }

        return { valid: true };
    }

    /**
     * 複数CSVをマージ
     */
    static mergeConversions(conversionArrays) {
        const merged = {};

        conversionArrays.forEach(conversions => {
            conversions.forEach(c => {
                if (!merged[c.id]) {
                    merged[c.id] = c;
                }
            });
        });

        return Object.values(merged);
    }

    /**
     * デュプリケーション除去
     */
    static deduplicateConversions(newConversions, existingConversions) {
        const existingIds = new Set(existingConversions.map(c => c.id));
        return newConversions.filter(c => !existingIds.has(c.id));
    }
}

// グローバルに公開
window.ASPConnector = ASPConnector;
