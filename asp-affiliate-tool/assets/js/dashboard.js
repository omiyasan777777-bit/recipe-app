/**
 * ASP アフィリエイト成約率最適化ダッシュボード
 * メインUI制御スクリプト
 */

class DashboardApp {
    constructor() {
        this.config = null;
        this.data = null;
        this.init();
    }

    async init() {
        // 設定とデータの読み込み
        await this.loadConfig();
        await this.loadData();

        // UIイベントのバインド
        this.setupEventListeners();

        // 初期表示の更新
        this.updateOverview();
        this.updateLinksTable();
        this.updateAnalytics();
        this.updateOptimization();
    }

    async loadConfig() {
        try {
            const response = await fetch('config.json');
            this.config = await response.json();
        } catch (e) {
            console.error('Failed to load config.json:', e);
            this.config = {
                campaigns: {},
                settings: {}
            };
        }
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            this.data = await response.json();
        } catch (e) {
            console.error('Failed to load data.json:', e);
            this.data = {
                links: [],
                conversions: [],
                posts: [],
                analytics: {
                    daily: [],
                    by_hour: [],
                    by_day_of_week: [],
                    by_tag: [],
                    by_campaign: []
                }
            };
        }
    }

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // リンク管理
        document.getElementById('new-link-btn').addEventListener('click', () => this.showNewLinkForm());
        document.getElementById('cancel-form').addEventListener('click', () => this.hideNewLinkForm());
        document.getElementById('link-form').addEventListener('submit', (e) => this.createLink(e));

        // 検索
        document.getElementById('link-search').addEventListener('input', (e) => this.filterLinks(e.target.value));

        // ファイルアップロード
        const uploadArea = document.getElementById('upload-area');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                document.getElementById('csv-file').files = e.dataTransfer.files;
            }
        });

        document.getElementById('csv-file').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                document.querySelector('.upload-area p').textContent = `選択: ${fileName}`;
            }
        });

        document.getElementById('import-btn').addEventListener('click', () => this.importCSV());
        document.getElementById('import-asp').addEventListener('change', () => this.updateImportButton());

        // 設定
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('export-data').addEventListener('click', () => this.exportData());
        document.getElementById('clear-data').addEventListener('click', () => this.clearData());

        // 同期ボタン
        document.getElementById('sync-btn').addEventListener('click', () => this.syncData());
    }

    switchTab(tabName) {
        // タブボタンの切り替え
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // タブコンテンツの切り替え
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });
    }

    updateOverview() {
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date().toISOString().slice(0, 7);

        // 今日のデータを計算
        const todayConversions = this.data.conversions.filter(c => c.conversion_timestamp.startsWith(today));
        const todayClicks = this.data.conversions.filter(c => c.click_timestamp.startsWith(today));
        const todayRevenue = todayConversions.reduce((sum, c) => sum + (c.amount || 0), 0);
        const todayConversionRate = todayClicks.length > 0
            ? ((todayConversions.length / todayClicks.length) * 100).toFixed(1)
            : 0;

        document.getElementById('today-conversions').textContent = todayConversions.length;
        document.getElementById('today-clicks').textContent = todayClicks.length;
        document.getElementById('today-conversion-rate').textContent = todayConversionRate + '%';
        document.getElementById('today-revenue').textContent = '¥' + todayRevenue.toLocaleString();

        // 今月のデータを計算
        const monthConversions = this.data.conversions.filter(c => c.conversion_timestamp.startsWith(thisMonth));
        const monthClicks = this.data.conversions.filter(c => c.click_timestamp.startsWith(thisMonth));
        const monthRevenue = monthConversions.reduce((sum, c) => sum + (c.amount || 0), 0);
        const monthConversionRate = monthClicks.length > 0
            ? ((monthConversions.length / monthClicks.length) * 100).toFixed(1)
            : 0;

        document.getElementById('month-conversions').textContent = monthConversions.length;
        document.getElementById('month-clicks').textContent = monthClicks.length;
        document.getElementById('month-conversion-rate').textContent = monthConversionRate + '%';
        document.getElementById('month-revenue').textContent = '¥' + monthRevenue.toLocaleString();

        // トップパフォーマー
        this.updateTopLinks();

        // トレンドチャート（簡易版）
        this.updateTrendChart();

        // 最後の同期時刻
        const now = new Date();
        document.getElementById('last-sync').textContent = `前回同期: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    updateTopLinks() {
        const linkStats = {};

        // 各リンクの成約数・売上を集計
        this.data.conversions.forEach(c => {
            if (!linkStats[c.link_id]) {
                linkStats[c.link_id] = {
                    conversions: 0,
                    revenue: 0
                };
            }
            linkStats[c.link_id].conversions++;
            linkStats[c.link_id].revenue += c.amount || 0;
        });

        // リンク情報とマージ
        const topLinks = this.data.links
            .map(link => ({
                ...link,
                stats: linkStats[link.id] || { conversions: 0, revenue: 0 }
            }))
            .sort((a, b) => b.stats.revenue - a.stats.revenue)
            .slice(0, 5);

        const tbody = document.getElementById('top-links');
        tbody.innerHTML = topLinks.length > 0
            ? topLinks.map(link => `
                <tr>
                    <td>${link.title}</td>
                    <td>${link.stats.conversions}</td>
                    <td>¥${link.stats.revenue.toLocaleString()}</td>
                    <td>${link.stats.conversions > 0 ? ((link.stats.conversions / 10) * 100).toFixed(1) : 0}%</td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align: center; color: #999;">データなし</td></tr>';
    }

    updateTrendChart() {
        // 簡易実装: 過去7日のトレンドをテキストで表示
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;

        // Canvas実装は省略（簡易版はテキスト表示）
        // 本実装ではChart.jsなどのライブラリを使用
    }

    updateLinksTable() {
        const tbody = document.getElementById('links-table');

        if (this.data.links.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">リンクはまだありません</td></tr>';
            return;
        }

        tbody.innerHTML = this.data.links.map(link => {
            const conversions = this.data.conversions.filter(c => c.link_id === link.id).length;
            const revenue = this.data.conversions
                .filter(c => c.link_id === link.id)
                .reduce((sum, c) => sum + (c.amount || 0), 0);

            return `
                <tr>
                    <td><code>${link.short_url}</code></td>
                    <td>${link.title}</td>
                    <td>${link.asp}</td>
                    <td>${conversions}</td>
                    <td>¥${revenue.toLocaleString()}</td>
                    <td>
                        <button class="btn btn-small" onclick="dashboard.editLink('${link.id}')">編集</button>
                        <button class="btn btn-small btn-danger" onclick="dashboard.deleteLink('${link.id}')">削除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateAnalytics() {
        // 投稿別分析（ダミー実装）
        const postAnalytics = document.getElementById('post-analytics');
        if (this.data.posts.length === 0) {
            postAnalytics.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">データなし</td></tr>';
        } else {
            postAnalytics.innerHTML = this.data.posts.map(post => {
                const convRate = post.clicks > 0
                    ? ((post.conversions / post.clicks) * 100).toFixed(1)
                    : 0;
                return `
                    <tr>
                        <td>${post.id}</td>
                        <td>${post.clicks}</td>
                        <td>${post.conversions}</td>
                        <td>${convRate}%</td>
                        <td>¥${post.revenue.toLocaleString()}</td>
                    </tr>
                `;
            }).join('');
        }

        // 時間帯別・曜日別は同様に実装
    }

    updateOptimization() {
        // 最適化提案エンジンを呼び出す
        if (typeof window.Optimizer !== 'undefined') {
            const optimizer = new Optimizer(this.data);
            const suggestions = optimizer.generateSuggestions();
            const resultsDiv = document.getElementById('optimization-results');

            if (suggestions.length === 0) {
                resultsDiv.innerHTML = '<p style="text-align: center; color: #999;">データが不足しています。成約データをインポートすると提案が表示されます。</p>';
            } else {
                resultsDiv.innerHTML = suggestions.map(s => `
                    <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #52c41a; margin: 10px 0; border-radius: 5px;">
                        <strong>${s.title}</strong>
                        <p>${s.description}</p>
                        <small style="color: #999;">${s.impact}</small>
                    </div>
                `).join('');
            }
        }
    }

    showNewLinkForm() {
        document.getElementById('new-link-form').style.display = 'block';
    }

    hideNewLinkForm() {
        document.getElementById('new-link-form').style.display = 'none';
        document.getElementById('link-form').reset();
    }

    createLink(e) {
        e.preventDefault();

        const link = {
            id: 'link_' + Date.now(),
            short_url: this.generateShortUrl(),
            title: document.getElementById('form-title').value,
            original_url: document.getElementById('form-url').value,
            asp: document.getElementById('form-asp').value,
            campaign_id: document.getElementById('form-campaign').value,
            tags: document.getElementById('form-tags').value.split(',').map(t => t.trim()).filter(t => t),
            created_at: new Date().toISOString(),
            notes: ''
        };

        this.data.links.push(link);
        this.saveData();
        this.updateLinksTable();
        this.hideNewLinkForm();

        this.showMessage(`リンク「${link.title}」を作成しました`, 'success');
    }

    generateShortUrl() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `thr.link/${result}`;
    }

    editLink(linkId) {
        console.log('Edit link:', linkId);
        // TODO: 編集フォーム実装
    }

    deleteLink(linkId) {
        if (confirm('このリンクを削除してもよろしいですか？')) {
            this.data.links = this.data.links.filter(l => l.id !== linkId);
            this.saveData();
            this.updateLinksTable();
            this.showMessage('リンクを削除しました', 'success');
        }
    }

    filterLinks(query) {
        const links = document.querySelectorAll('#links-table tr');
        links.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });
    }

    updateImportButton() {
        const btn = document.getElementById('import-btn');
        const asp = document.getElementById('import-asp').value;
        const file = document.getElementById('csv-file').files.length > 0;
        btn.disabled = !asp || !file;
    }

    async importCSV() {
        const file = document.getElementById('csv-file').files[0];
        const asp = document.getElementById('import-asp').value;

        if (!file || !asp) {
            alert('ファイルとASPを選択してください');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const rows = csv.split('\n');
            const headers = rows[0].split(',').map(h => h.trim());

            // CSV解析とデータマージ（ASP別に異なる）
            let importedCount = 0;
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;

                const values = rows[i].split(',').map(v => v.trim());
                const record = {};
                headers.forEach((h, idx) => {
                    record[h] = values[idx];
                });

                // 成約データを追加（デュプリケーション回避）
                if (!this.data.conversions.find(c => c.id === record.conversion_id)) {
                    this.data.conversions.push({
                        id: record.conversion_id || `conv_${Date.now()}_${i}`,
                        link_id: record.link_id || '',
                        post_id: record.post_id || '',
                        click_timestamp: record.click_date || new Date().toISOString(),
                        conversion_timestamp: record.conversion_date || new Date().toISOString(),
                        amount: parseInt(record.amount) || 0,
                        commission: parseInt(record.commission) || 0,
                        status: 'confirmed'
                    });
                    importedCount++;
                }
            }

            this.saveData();
            this.updateOverview();
            this.updateAnalytics();

            const resultDiv = document.getElementById('import-result');
            resultDiv.style.display = 'block';
            resultDiv.className = 'alert success';
            document.getElementById('import-message').textContent = `${importedCount}件の成約データをインポートしました`;

            // インポート履歴に記録
            if (!this.data.import_history[asp]) {
                this.data.import_history[asp] = [];
            }
            this.data.import_history[asp].push({
                date: new Date().toISOString(),
                count: importedCount,
                status: 'success'
            });
            this.saveData();
        };
        reader.readAsText(file);
    }

    saveSettings() {
        // ASP設定の保存
        document.querySelectorAll('[data-asp]').forEach(checkbox => {
            const asp = checkbox.dataset.asp;
            if (this.config.asp[asp]) {
                this.config.asp[asp].enabled = checkbox.checked;
            }
        });

        // Threads連携設定の保存
        if (this.config.threads_integration) {
            this.config.threads_integration.enabled = document.getElementById('threads-integration').checked;
            this.config.threads_integration.spreadsheet_url = document.getElementById('threads-sheet-url').value;
        }

        this.saveConfig();
        this.showMessage('設定を保存しました', 'success');
    }

    exportData() {
        const exportData = {
            config: this.config,
            data: this.data
        };
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asp-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    clearData() {
        if (confirm('すべてのデータを削除します。この操作は復旧できません。よろしいですか？')) {
            this.data = {
                links: [],
                conversions: [],
                posts: [],
                analytics: {
                    daily: [],
                    by_hour: [],
                    by_day_of_week: [],
                    by_tag: [],
                    by_campaign: []
                }
            };
            this.saveData();
            this.updateOverview();
            this.updateLinksTable();
            this.showMessage('データをリセットしました', 'success');
        }
    }

    syncData() {
        // データの再読み込みと再計算
        this.loadData().then(() => {
            this.updateOverview();
            this.updateAnalytics();
            this.updateOptimization();
            this.showMessage('データを同期しました', 'success');
        });
    }

    saveData() {
        localStorage.setItem('asp-data', JSON.stringify(this.data));
    }

    saveConfig() {
        localStorage.setItem('asp-config', JSON.stringify(this.config));
    }

    showMessage(text, type = 'info') {
        // シンプルなトースト通知
        const div = document.createElement('div');
        div.className = `alert ${type}`;
        div.textContent = text;
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.right = '20px';
        div.style.zIndex = '9999';
        div.style.maxWidth = '400px';
        document.body.appendChild(div);

        setTimeout(() => {
            div.remove();
        }, 3000);
    }
}

// アプリケーションの初期化
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardApp();
});
