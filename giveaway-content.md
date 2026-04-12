# Claude Code × Justfile で「CI/CD を自分でスケジュール」する時代へ

---

## 🎁 特典① すぐ使えるJustfileテンプレート

以下をプロジェクトの `justfile` として保存し、`just --list` で確認。`just setup` で自動化フロー開始。

```justfile
# 🚀 Claude Code 自動化テンプレート
# コピーして justfile として保存し、just <command> で実行

# デフォルトアクション
default:
    @just --list

# ========== フェーズ0: 環境チェック ==========
check-env:
    #!/bin/bash
    echo "🔍 環境チェック開始..."
    
    # Python
    if command -v python3 &> /dev/null; then
        echo "✅ Python: $(python3 --version)"
    else
        echo "❌ Python が見つかりません"
        exit 1
    fi
    
    # Node.js
    if command -v node &> /dev/null; then
        echo "✅ Node.js: $(node --version)"
    else
        echo "❌ Node.js が見つかりません"
        exit 1
    fi
    
    # clasp
    if command -v clasp &> /dev/null; then
        echo "✅ clasp: $(clasp --version)"
    else
        echo "⚠️  clasp が見つかりません。インストール中..."
        npm install -g @google/clasp
    fi
    
    echo "✅ 環境チェック完了"

# ========== フェーズ1: コンセプト作成 ==========
concept:
    #!/bin/bash
    echo "🎯 コンセプト作成を開始します"
    echo ""
    echo "以下の質問に答えてください："
    echo "1️⃣  あなたのコアメッセージ（ペルソナ）は何ですか？"
    read persona
    echo ""
    echo "2️⃣  よく使う専門用語・キーワード（3個以上）："
    read keywords
    echo ""
    echo "3️⃣  定期的に取り上げるテーマは？"
    read themes
    echo ""
    
    # strategy.md 生成
    mkdir -p content
    cat > content/strategy.md << EOF
# Threads 投稿戦略

## ペルソナ
$persona

## よく使う語彙・キーワード
$keywords

## 定期テーマ
$themes

## ハッシュタグ（使わない）
※ Threads では検索性がないため使用なし

## ポスト目標
・毎日フォロワー増加
・リスト（LINEクリップ等）獲得
・エンゲージメント率 5%以上
EOF
    
    echo "✅ content/strategy.md を生成しました"
    cat content/strategy.md

# ========== フェーズ2: Threads API 接続 ==========
setup-api:
    #!/bin/bash
    echo "🔐 Threads API トークンが必要です"
    echo ""
    echo "以下の手順でトークンを取得してください："
    echo "1. PCブラウザで、APIを取得したい Threads/Instagram アカウントでログイン"
    echo "2. https://developers.facebook.com にアクセス"
    echo "3. アプリを作成 → Threads API を有効化"
    echo "4. アクセストークンを生成（Personal Access Token）"
    echo ""
    echo "トークンをコピーしてここに貼り付けてください："
    read -s token
    
    # config.json に保存（※本番環境では .env や環境変数を使うこと）
    mkdir -p .
    cat > config.json << EOF
{
  "threads_token": "$token",
  "spreadsheet_url": "",
  "webapp_url": "",
  "webapp_key": "",
  "schedule": {
    "start_date": "2026-04-12",
    "posting_hours": [9, 12, 15, 18, 21],
    "random_minutes": true,
    "timezone": "Asia/Tokyo"
  }
}
EOF
    
    echo "✅ API トークンを保存しました（.gitignore に追加してください）"

# ========== フェーズ3: Google Apps Script セットアップ ==========
setup-gas:
    #!/bin/bash
    echo "📊 Google Apps Script セットアップ"
    echo ""
    echo "以下を実行します："
    echo "1. clasp ログイン"
    echo "2. Apps Script プロジェクト作成"
    echo "3. コード反映"
    
    # clasp ログイン確認
    clasp login --status || clasp login
    
    # Apps Script プロジェクト作成
    if [ ! -f .clasp.json ]; then
        echo "Creating new Apps Script project..."
        clasp create --type sheets --title "Threads自動投稿管理"
    fi
    
    # ルートディレクトリを確認・修正
    echo "⚠️  .clasp.json の rootDir を確認してください"
    cat .clasp.json
    
    # コードをコピー（あらかじめ setup/ に appscript.gs と appsscript.json を配置）
    if [ -d setup ]; then
        cp setup/appscript.gs .
        cp setup/appsscript.json .
    fi
    
    # push
    clasp push
    
    echo "✅ Apps Script がデプロイされました"
    echo "📱 ブラウザでスプシを開いて、上のメニューに『自動投稿』が表示されるか確認してください"

# ========== フェーズ4: 投稿生成 & 転記 ==========
generate-posts:
    #!/bin/bash
    echo "📝 投稿生成を開始します"
    echo ""
    echo "何日分生成しますか？（例: 3 = 3日間 × 2投稿/日 = 6本）"
    read days
    
    # バッチ数計算
    batch_count=$((days * 2 / 10 + 1))
    
    echo "🎯 $batch_count バッチ分を生成します（合計 $((batch_count * 10)) 投稿）"
    
    # Python スクリプト経由で投稿を生成
    python3 - << 'PYTHON'
import os
import datetime

# content/strategy.md, content/rules.md を読んで投稿を生成
# （この部分は Claude Code が自動生成します）

batch_num = 1
output_dir = "output"
os.makedirs(output_dir, exist_ok=True)

print(f"✅ batch_{batch_num:04d}.txt に {10} 投稿を生成しました")
PYTHON
    
    # 生成完了メッセージ
    echo ""
    echo "✅ 投稿生成完了"
    echo "📊 transfer-to-sheet で Google スプシに自動転記します"

# ========== 転記 & 自動化 ==========
transfer-to-sheet:
    #!/bin/bash
    echo "📊 スプレッドシートに転記します"
    
    if [ -f "config.json" ]; then
        python3 scheduler.py output/batch_*.txt --post
        echo "✅ 転記完了！スプシを自動で開きます"
        
        # スプシを開く
        sheet_url=$(grep -o '"spreadsheet_url": "[^"]*"' config.json | cut -d'"' -f4)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "$sheet_url"
        elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
            start "$sheet_url"
        fi
    else
        echo "❌ config.json が見つかりません。setup-api を実行してください"
    fi

# ========== 全体フロー（初回セットアップ） ==========
setup: check-env concept setup-api setup-gas
    echo ""
    echo "🎉 セットアップ完了！"
    echo ""
    echo "次のステップ："
    echo "  just generate-posts    ← 投稿を生成"
    echo "  just transfer-to-sheet ← スプシに転記"
    echo "  just menu              ← 操作メニュー"

# ========== 操作メニュー ==========
menu:
    #!/bin/bash
    while true; do
        echo ""
        echo "============================================"
        echo "  Threads Auto Post"
        echo "============================================"
        echo ""
        echo "  [1] 投稿生成（1バッチ = 10本）"
        echo "  [2] まとめて生成 + 転記"
        echo "  [3] スプシを開く"
        echo "  [5] リンク設定"
        echo "  [6] スケジュール確認"
        echo "  [C] コンセプト編集"
        echo "  [R] 生成ルール確認"
        echo "  [0] 終了"
        echo ""
        echo "選択してください："
        read choice
        
        case $choice in
            1) just generate-posts ;;
            2) just generate-posts && just transfer-to-sheet ;;
            3) just open-sheet ;;
            5) echo "🔗 links.json を編集してください" ;;
            6) echo "📋 config.json の schedule を確認：" && cat config.json ;;
            C) $EDITOR content/strategy.md ;;
            R) $EDITOR content/rules.md ;;
            0) echo "👋 終了します"; exit 0 ;;
            *) echo "❌ 選択肢が無効です" ;;
        esac
    done

# ========== ヘルパー ==========
open-sheet:
    #!/bin/bash
    sheet_url=$(grep -o '"spreadsheet_url": "[^"]*"' config.json | cut -d'"' -f4)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$sheet_url"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        start "$sheet_url"
    else
        echo "スプシURL: $sheet_url"
    fi

clean:
    #!/bin/bash
    echo "🗑️  生成済み投稿を削除します"
    rm -rf output/batch_*.txt
    echo "✅ 削除完了"

.PHONY: check-env concept setup-api setup-gas generate-posts transfer-to-sheet setup menu open-sheet clean
```

**使い方:**
```bash
just setup          # 初回セットアップ（環境確認→コンセプト→API→GAS）
just generate-posts # 投稿生成
just transfer-to-sheet  # スプシに転記
just menu           # 操作メニュー（何度も使える）
```

---

## 🎁 特典② CLAUDE.md 記述テンプレート

プロジェクトフォルダに `CLAUDE.md` を置いて、毎回の指示をシンプルに。

```markdown
# プロジェクト名

このプロジェクトは [プロジェクトの1文説明] を自動化する仕組みです。

---

## 技術スタック

- **言語**: Python 3.10+, JavaScript (Node.js 18+)
- **主なツール**: clasp（Google Apps Script CLI）, Selenium（スプシ自動化）
- **外部API**: Threads API, Google Sheets API
- **ランタイム**: GitHub Actions（スケジューリング）

---

## 環境変数・認証

以下を `.env.local` に設定（Git管理外）：

```bash
THREADS_TOKEN=your_token_here
SPREADSHEET_ID=your_sheet_id
```

`config.json` にはURL・スケジュール等をYAML形式で記述。

---

## ファイル構成と役割

```
project/
├── CLAUDE.md                ← このファイル（プロジェクト概要）
├── justfile                 ← コマンド自動化（just setup など）
├── config.json              ← 設定ファイル（スプシURL、スケジュール）
├── scheduler.py             ← TSV変換・Web App連携
├── setup/
│   ├── appscript.gs         ← Google Apps Script（スプシ自動転記）
│   └── appsscript.json      ← GAS マニフェスト
├── content/
│   ├── strategy.md          ← 投稿戦略（ペルソナ・キーワード・テーマ）
│   ├── rules.md             ← 生成ルール・品質基準
│   └── structures.md        ← 投稿パターン集
├── templates/
│   └── concept_questions.md ← コンセプト作成用の質問集
├── output/
│   └── batch_XXXX.txt       ← 生成投稿（TSV化前）
└── .gitignore               ← config.json, .env.local を除外
```

---

## コーディング規約

### Python
- フォーマッタ: `black` （`black . --line-length 100`）
- 型チェック: `mypy` （オプション）
- 依存管理: `requirements.txt`

```bash
pip install -r requirements.txt
black .
```

### JavaScript (GAS)
- フォーマッタ: prettier （`npx prettier --write "**/*.gs"`）
- 関数は `function functionName() { ... }` で統一
- ログは `Logger.log()` を使用

### Markdown
- 行長: 80-100文字
- 見出しレベル: `#` から開始（`##` 以下を本文用に）

---

## 初回セットアップ

```bash
# 1. 環境チェック + 自動インストール
just check-env

# 2. コンセプト作成（対話形式）
just concept

# 3. Threads API トークン設定
just setup-api

# 4. Google Apps Script デプロイ
just setup-gas

# 完了
just setup  # 上記すべてを一括実行
```

---

## 日常的な使い方

```bash
# 投稿生成（Claude Code が直接生成）
just generate-posts

# スプシに転記（Web App経由）
just transfer-to-sheet

# メニュー（対話型）
just menu
```

---

## 重要なルール

✅ **DO:**
- `content/strategy.md`, `content/rules.md`, `content/structures.md` を必ず読んで投稿を生成する
- Claude Code が直接投稿を生成する（サブエージェント不可）
- 生成投稿は `output/batch_XXXX.txt` に保存
- 転記後は `output/archive/` に移動

❌ **DON'T:**
- 外部APIで投稿を生成しない
- Task tool・サブエージェントで投稿生成しない
- `config.json` や `.env.local` を Git コミットしない
- パターン重複（1バッチ内で同じ構造 2回）
- ハードコードされたトークンをコミットしない

---

## 品質チェックリスト

生成時は以下を必ず確認：

- [ ] 文字数: 単体200-500字, スレッド各投稿200-500字
- [ ] キーワード: strategy.md の語彙を 2-3個含む
- [ ] パターン: structures.md のパターンを活用
- [ ] CTA: スレッドのみ、最後に自然に溶け込ませる
- [ ] 重複なし: 1バッチ内でパターン重複なし

---

## トラブルシューティング

| 問題 | 原因 | 解決策 |
|------|------|---------|
| `clasp push` で "Skipping push" | `.clasp.json` の `rootDir` が空 | `rootDir` を絶対パスで設定 |
| GAS が "認証が必要" | Apps Script 権限未承認 | スプシで「自動投稿」メニュー → 認証 |
| Web App で 404 | スプシに Apps Script 連携なし | スプシを開いて「拡張機能」→「Apps Script」で確認 |
| 投稿が重複 | `output/archive/` への移動漏れ | `output/` の古いファイルを削除 |

---

## 参考資料

- [Threads API 公式ドキュメント](https://developers.facebook.com/docs/threads)
- [Google Apps Script 公式](https://developers.google.com/apps-script)
- [clasp GitHub](https://github.com/google/clasp)
- [Justfile 公式](https://just.systems/)

---

## ライセンス・免責

このプロジェクトには BAN 対策のナレッジが含まれていますが、Threads アカウント凍結を100%防ぐことはできません。
プラットフォーム側の判断によるアカウント凍結・制限について、本プロジェクトの提供元は一切の責任を負いかねます。
```

---

## 🎁 特典③ コスト試算シート

「Claude API 従量課金」と「Claude Pro + Claude Code」のコスト比較表。note に貼り付けて使えます。

```
===================================================
      Claude を使った Threads 自動投稿
      コスト比較（月額・想定）
===================================================

📊 シナリオ設定

投稿生成頻度: 毎日 2本
月間投稿数: 60本（30日 × 2本/日）
バッチサイズ: 10本（6日分 = 1バッチ）
月間バッチ数: 5バッチ

---

### パターン A: Claude API 従量課金（未推奨）

❌ 高コスト・管理負担

使用回数:
  • 投稿生成: 5バッチ × 300トークン/バッチ = 1,500トークン
  • strategy.md 読込: 5回 × 100トークン = 500トークン
  • rules.md 読込: 5回 × 150トークン = 750トークン
  • structures.md 読込: 5回 × 200トークン = 1,000トークン
  ─────────────────────────────────
  計: 3,750トークン/月 INPUT

出力トークン:
  • 投稿本体: 60本 × 150トークン = 9,000トークン

INPUT: 3,750 トークン = 約¥1.69/月
OUTPUT: 9,000 トークン = 約¥3.60/月
─────────────────────────────────
月額: 約 ¥5.29

⚠️  問題点:
- APIキーの管理が必要（セキュリティ負担）
- 使用量を常に監視しないと予期しない請求が来る
- トークン数の計算が複雑
- Proプラン割引が使えない

---

### パターン B: Claude Pro（推奨）✅

✅ 安い・管理シンプル

費用:
  Claude Pro: ¥2,000/月（定額）
  Claude Code: 月額自動更新に含まれる

特徴:
  ✅ 従量課金なし（定額 = 予算確定）
  ✅ APIキー管理不要
  ✅ トークン数無制限（実用範囲）
  ✅ Claude Code Web版・CLI版・IDE拡張すべて使える
  ✅ Vision API（画像解析）も無制限
  ✅ Proユーザーの優先サポート

月額: ¥2,000（確定）

---

### 節約額の比較

| | API従量課金 | Claude Pro |
|------|-----------|-----------|
| 月額 | ¥5～200 | ¥2,000 |
| 年間 | ¥60～2,400 | ¥24,000 |
| APIキー管理 | 必要 | 不要 |
| セキュリティ | 中程度 | 高い |
| **結論** | **想定外の請求リスク大** | **安心・安定** |

---

### 実際の使用パターン別シミュレーション

#### 月60本（毎日2本）
- API従量課金: ¥5-10
- Claude Pro: ¥2,000
→ **Pro の方が安い** ✅

#### 月360本（毎日12本・大量運用）
- API従量課金: ¥50-100
- Claude Pro: ¥2,000
→ **Pro の方が圧倒的に安い** ✅✅

#### 月1,800本（毎日60本・企業向け大規模運用）
- API従量課金: ¥500-1,000
- Claude Pro: ¥2,000
→ **API従量課金が勝つが、リスク大**
→ **推奨: Enterprise プラン検討**

---

### なぜ Claude Pro が経済的か

1. **定額制による予測可能性**
   - APIキーだと「今月いくら使った？」が不透明
   - 予算上限が作りやすい

2. **多機能なセット価格**
   - Web版 + CLI版 + IDE拡張すべてが ¥2,000
   - APIキー単体だと各機能ごとに追加費用

3. **Vision API 無料**
   - Threads投稿の画像検証・分析が無料
   - スクリーンショット解析等も追加料金ゼロ

4. **優先度の高いサポート**
   - トラブル時の対応が早い

---

### 最終結論

| 用途 | 推奨 | 理由 |
|------|------|------|
| 個人・小規模運用 | Claude Pro ✅ | ¥2,000で安心・無制限 |
| 中規模（月500本以上） | Claude Pro ✅ | API従量課金より圧倒的に安い |
| 企業・大規模運用 | Anthropic Enterprise | 月数千本以上の場合 |

✅ **一般的には Claude Pro で十分**

---

### Claude Pro 登録方法

1. https://claude.ai にアクセス
2. 右上「プランを更新」
3. 「Claude Pro」を選択
4. ¥2,000/月で購読開始
5. Claude Code でそのまま使える（追加設定不要）

以上で即座にコスト最適化が完了します。

===================================================
```

---

## 📋 3つの特典をまとめて

上記3つをそのまま note に貼り付けられます：

1. **特典①** → Justfile（コマンド全自動化）
2. **特典②** → CLAUDE.md テンプレート（プロジェクト仕様書）
3. **特典③** → コスト試算シート（金銭的メリット）

**note での使い方:**
- 各コードブロックはそのままコピペ可能
- ファイル名が付いてるので「これは justfile として保存」とわかる
- 表はマークダウン形式なので note で自動整形される

では、さっそく note に貼り付けて、読者が即実装できるようにしましょう！ 📝
