# ASP アフィリエイト成約率最適化ダッシュボード

Threads投稿から商品紹介リンクへの成約まで、全導線を自動追跡・分析・最適化するシステム。

---

## システム概要

### 目的
- **複数ASP（A8.net, afb, Monetrack等）の成約データ一元管理**
- **Threads投稿別の成約率を自動計算・可視化**
- **投稿テキスト・リンク位置・投稿時間が成約率に与える影響を分析**
- **高成約パターンを自動抽出し、今後の投稿生成に反映**

### 対応ASP
- **A8.net** - CSV手動ダウンロード or API（有料プラン）
- **afb** - CSV手動ダウンロード
- **Monetrack** - CSV手動ダウンロード
- **Amazon アソシエイト** - CSV手動ダウンロード

### 主な機能

| 機能 | 説明 |
|------|------|
| **リンク管理** | Threads投稿用の短縮URL一元管理、タグ付け、キャンペーン分類 |
| **成約追跡** | UTMパラメータ・カスタムパラメータで投稿 → クリック → 成約の導線を記録 |
| **自動分析** | 投稿別・時間帯別・曜日別の成約率、LTV、ROI自動計算 |
| **ダッシュボード** | リアルタイムで成約・クリック・成約率を可視化 |
| **最適化提案** | A/Bテスト結果から「高成約パターン」を自動抽出・提案 |
| **Threads連携** | 投稿生成時に自動的にリンク割り当て、成約データを投稿別に集計 |

---

## セットアップ

### 初回セットアップ（ユーザー向け）

#### Step 1: ファイル確認
```bash
ls asp-affiliate-tool/
```
以下のファイルが存在することを確認：
- `config.json` - ASP設定・キャンペーン設定
- `data.json` - リンク・成約データ
- `index.html` - ダッシュボード

#### Step 2: ASPトークン・API設定
`config.json` を編集して、各ASPの設定を入力：
```json
{
  "asp": {
    "a8": {
      "enabled": true,
      "api_token": "YOUR_A8_TOKEN",
      "program_ids": ["123456", "789012"]
    },
    "afb": {
      "enabled": true,
      "csv_import_folder": "/path/to/afb-csvs"
    }
  },
  "campaigns": {
    "threads_general": {
      "platform": "Threads",
      "active": true,
      "daily_posts": 10
    }
  }
}
```

#### Step 3: ダッシュボードを開く
```bash
# Mac
open asp-affiliate-tool/index.html

# Windows
start asp-affiliate-tool/index.html
```

#### Step 4: リンク作成
ダッシュボード → 「新規リンク」で投稿用のリンクを生成

#### Step 5: Threads投稿で使用
生成されたリンクを投稿本文に貼り付け

#### Step 6: 成約データをインポート
ASPダッシュボードからCSVをダウンロード → ダッシュボード「インポート」でアップロード

---

## データ構造

### config.json

```json
{
  "version": "1.0",
  "asp": {
    "a8": {
      "enabled": true,
      "api_type": "csv",
      "program_ids": []
    },
    "afb": {
      "enabled": true,
      "api_type": "csv"
    },
    "monetrack": {
      "enabled": true,
      "api_type": "csv"
    },
    "amazon": {
      "enabled": false,
      "api_type": "csv"
    }
  },
  "campaigns": {
    "threads_general": {
      "id": "threads_general",
      "name": "Threads 一般投稿",
      "platform": "Threads",
      "asp": ["a8", "afb"],
      "active": true,
      "daily_posts": 10,
      "notes": ""
    }
  },
  "tracking": {
    "utm_source": "threads",
    "utm_medium": "social",
    "utm_campaign": ""
  },
  "settings": {
    "timezone": "Asia/Tokyo",
    "currency": "JPY",
    "webhook_enabled": false,
    "webhook_url": ""
  }
}
```

### data.json - リンク管理

```json
{
  "links": [
    {
      "id": "link_001",
      "short_url": "thr.link/abc123",
      "original_url": "https://example.com/product",
      "title": "商品名",
      "asp": "a8",
      "program_id": "123456",
      "campaign_id": "threads_general",
      "tags": ["美容", "新作"],
      "created_at": "2026-04-11T10:00:00Z",
      "notes": ""
    }
  ],
  "conversions": [
    {
      "id": "conv_001",
      "link_id": "link_001",
      "post_id": "post_123",
      "click_timestamp": "2026-04-11T14:30:00Z",
      "conversion_timestamp": "2026-04-11T15:45:00Z",
      "amount": 5000,
      "commission": 500,
      "status": "confirmed"
    }
  ],
  "posts": [
    {
      "id": "post_123",
      "content": "投稿テキスト",
      "links_used": ["link_001", "link_002"],
      "posted_at": "2026-04-11T09:00:00Z",
      "platform": "Threads",
      "impressions": 1500,
      "clicks": 45,
      "conversions": 3,
      "revenue": 15000
    }
  ],
  "analytics": {
    "daily": [
      {
        "date": "2026-04-11",
        "clicks": 150,
        "conversions": 10,
        "conversion_rate": 0.067,
        "revenue": 50000,
        "commission": 5000
      }
    ]
  }
}
```

---

## ダッシュボード機能詳細

### 1. 概要タブ
- **今日の成約数・売上・クリック数**
- **今月の累計成約・売上・平均成約率**
- **過去7日間のチャート**（成約トレンド）
- **トップパフォーマー** - 今月の売上TOP 5リンク

### 2. リンク管理タブ
- **リンク一覧** - ID、URL、ASP、成約数、売上
- **新規リンク作成** - URLとタイトルを入力 → 短縮URL自動生成
- **リンク編集** - タグ変更、キャンペーン変更
- **リンク削除** - アーカイブ（削除ではなく非表示化）

### 3. 分析タブ
- **投稿別成約率** - 各Threads投稿のクリック数・成約数・成約率
- **時間帯別分析** - 何時に投稿した記事が最も成約しやすいか
- **曜日別分析** - 月・火・水などで成約率に差があるか
- **カテゴリ別** - タグ別の成約率集計

### 4. インポートタブ
- **ASP CSVアップロード** - A8.net, afb等のCSVをドラッグ&ドロップ
- **自動マッピング** - カラムを自動判定、成約データを自動マージ
- **デュプリケーション回避** - 既に登録済みの成約は除外

### 5. 設定タブ
- **ASP有効/無効の切り替え**
- **キャンペーン管理** - 新規作成、編集、削除
- **Threads連携設定** - スプシURL、投稿情報の取得方法
- **エクスポート** - データをJSON/CSV形式でダウンロード

---

## Threads投稿との連携

### 自動連携フロー

1. **投稿生成時**
   - `nuko-threads/scheduler.py` がリンク作成リクエストを送信
   - `asp-affiliate-tool/` がリンクを生成、短縮URLを返す
   - 生成されたURLを投稿に挿入、スプシに転記

2. **投稿時**
   - Threads投稿にリンクが含まれる
   - ユーザーがクリック → アフィリエイトサイトへ遷移

3. **成約時**
   - ASP（A8.net等）で成約が記録される
   - 日次でASPからCSVをダウンロード
   - ダッシュボード「インポート」でアップロード

4. **レポート生成**
   - ダッシュボードが投稿別の成約データを自動集計
   - 投稿ごとのCV率、売上、CLVを表示
   - 今後の投稿改善に反映

### config.json での設定

```json
{
  "threads_integration": {
    "enabled": true,
    "spreadsheet_url": "https://docs.google.com/spreadsheets/d/...",
    "sync_interval_hours": 6,
    "auto_generate_links": true,
    "link_per_post": 1
  }
}
```

---

## 最適化エンジン

### 自動提案機能

ダッシュボード「最適化」タブで、以下の提案が表示されます：

#### 1. 時間帯最適化
```
📊 提案: 午前10時の投稿が成約率18%で最高です
   └─ 従来: 全時間帯平均 12%
   └─ 効果: 毎日同じ時間に投稿すれば +50% 売上増
```

#### 2. リンク位置最適化
```
📍 提案: 投稿の「本文中盤」に貼ったリンクが最成約
   └─ 本文末尾: 成約率 8%
   └─ 本文中盤: 成約率 15%  ← 推奨
   └─ 固定投稿: 成約率 5%
```

#### 3. テキスト長最適化
```
📝 提案: 200〜300字の投稿が最成約
   └─ 100字以下: 成約率 5%
   └─ 200〜300字: 成約率 16%  ← 最高
   └─ 400字以上: 成約率 9%
```

#### 4. CTA文言最適化
```
💬 提案: 「気になった方はこちら」系CTAが +12% 高成約
   └─ CTAなし: 成約率 8%
   └─ 「詳しくはこちら」: 成約率 14%
   └─ 「気になった方はこちら」: 成約率 16% ← 推奨
```

#### 5. カテゴリ別成約率
```
🏷️ 高成約カテゴリ TOP 3:
   1. 美容系 - 成約率 22%
   2. 健康系 - 成約率 18%
   3. ファッション系 - 成約率 15%
```

---

## API リファレンス

### リンク作成

```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{
    "original_url": "https://example.com",
    "title": "商品名",
    "campaign_id": "threads_general",
    "tags": ["美容", "新作"]
  }'
```

**レスポンス:**
```json
{
  "id": "link_001",
  "short_url": "thr.link/abc123",
  "original_url": "https://example.com",
  "campaign_id": "threads_general"
}
```

### 成約データインポート

```bash
curl -X POST http://localhost:3000/api/conversions/import \
  -H "Content-Type: multipart/form-data" \
  -F "file=@a8_conversions.csv" \
  -F "asp=a8"
```

### 分析データ取得

```bash
curl http://localhost:3000/api/analytics/daily?date_from=2026-04-01&date_to=2026-04-30
```

**レスポンス:**
```json
{
  "daily": [
    {
      "date": "2026-04-11",
      "clicks": 150,
      "conversions": 10,
      "conversion_rate": 0.067,
      "revenue": 50000,
      "commission": 5000
    }
  ]
}
```

---

## 運用ガイド

### 毎日の作業
1. ダッシュボードを開く
2. 前日のクリック数・成約数を確認
3. 高成約投稿をメモ

### 週1回の作業
1. ASPダッシュボードでCSVをダウンロード
2. ダッシュボード「インポート」でアップロード
3. 「分析」タブで時間帯・カテゴリ別成約率を確認
4. 「最適化」タブから提案を確認

### 月1回の作業
1. 月間成約・売上・平均成約率をレポート化
2. 高成約パターンを投稿生成ルール（`content/rules.md`）に反映
3. 低成約カテゴリの投稿本数を減らす

### トラブルシューティング

#### 成約データが反映されない
- [ ] ASP設定が正しいか確認
- [ ] CSVのカラム名が正しいか確認（ASPにより異なる）
- [ ] 日付形式が統一されているか確認（YYYY-MM-DD）

#### リンクのクリック数がゼロ
- [ ] リンクがThreads投稿に含まれているか確認
- [ ] 投稿が実際に公開されているか確認
- [ ] リンクのUTMパラメータが正しいか確認

---

## ファイル構成

```
asp-affiliate-tool/
├── CLAUDE.md                 ← このファイル
├── config.json              ← ASP設定・キャンペーン設定
├── data.json                ← リンク・成約・分析データ
├── index.html               ← ダッシュボードUI
├── assets/
│   ├── css/
│   │   └── dashboard.css    ← スタイル
│   └── js/
│       ├── dashboard.js     ← UI制御
│       ├── analytics.js     ← 分析ロジック
│       ├── optimizer.js     ← 最適化提案エンジン
│       └── asp-connector.js ← ASP連携
└── docs/
    └── asp-csv-format.md    ← ASP別CSV形式ドキュメント
```

---

## まとめ

このツールにより、以下が実現されます：

✅ **成約データの一元管理** - 複数ASPのデータを1つのダッシュボードで閲覧
✅ **投稿別の成約率可視化** - どの投稿が何件成約したかが一目瞭然
✅ **時間帯・曜日別分析** - 最適な投稿時間を科学的に決定
✅ **自動最適化提案** - パターン分析から高成約テンプレートを提案
✅ **Threads連携自動化** - 投稿生成 → リンク割り当て → 成約追跡がワンストップ

---

**Q&A**

**Q: データはどこに保存される？**
A: ブラウザのローカルストレージ + data.json（オプション）。サーバー不要で完全ローカル運用が可能です。

**Q: ASPのCSVをどのくらい頻繁にインポートする？**
A: 週1回以上推奨。ASPは成約の確定に数日かかるため、毎日CSVをDLしても直近のデータは確定していません。

**Q: Threads投稿の何本に1本の割合でリンクを貼る？**
A: 投稿10本中2本程度が一般的な最適値です。config.jsonで調整できます。

**Q: 複数のInstagramアカウント・Threadsアカウントで使える？**
A: はい。config.jsonで`campaigns`を追加すれば、複数キャンペーン管理が可能です。

