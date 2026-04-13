# 🎁 特典①：すぐ使えるJustfileテンプレート

**このテンプレートをコピーして、プロジェクトに `justfile` という名前で置くだけで即使えます。**

---

## Justfileの役割

毎回タイプするコマンドを1語で実行。開発効率が劇的に上がります。

```bash
just setup      # セットアップ一式を実行
just dev        # 開発環境を起動
just test       # テストを実行
just deploy     # デプロイ
```

---

## 📋 汎用テンプレート

以下をコピーして `justfile` というファイルをプロジェクトルートに置いてください。

```just
# ===============================================
# Justfile テンプレート — 自動化フロー
# ===============================================
# 使い方: プロジェクトルートに置いて「just コマンド名」で実行

set shell := ["bash", "-uc"]
set windows_shell := ["pwsh.exe", "-NoProfile", "-Command"]

# ===============================================
# 初期化・セットアップ
# ===============================================

@setup: setup-check install-deps init-config
    echo "✅ セットアップ完了！"
    echo ""
    echo "次のコマンドで開発を開始できます："
    echo "  just dev       - 開発環境を起動"
    echo "  just test      - テストを実行"

setup-check:
    #!/usr/bin/env bash
    echo "🔍 環境チェック..."
    
    check_cmd() {
        if ! command -v $1 &> /dev/null; then
            echo "❌ $1 がインストールされていません"
            return 1
        fi
        echo "✅ $1: $(eval "$1 --version" 2>&1 | head -1)"
    }
    
    check_cmd "node"
    check_cmd "python3"
    
    if [ -f "package.json" ]; then
        echo "✅ package.json 検出"
    fi

install-deps:
    #!/usr/bin/env bash
    if [ -f "package.json" ]; then
        echo "📦 Node依存をインストール..."
        npm install
    fi
    
    if [ -f "requirements.txt" ]; then
        echo "🐍 Python依存をインストール..."
        pip install -r requirements.txt
    fi

init-config:
    #!/usr/bin/env bash
    if [ ! -f ".env" ]; then
        echo "📝 .env ファイルを作成..."
        cat > .env << 'EOF'
NODE_ENV=development
DEBUG=true
EOF
        echo "ℹ️  .env が作成されました。必要に応じて編集してください。"
    else
        echo "✅ .env はすでに存在します"
    fi

# ===============================================
# 開発
# ===============================================

@dev:
    echo "🚀 開発環境を起動..."
    just watch & just server

watch:
    #!/usr/bin/env bash
    if [ -f "package.json" ]; then
        npm run watch
    else
        echo "package.json が見つかりません"
    fi

server:
    #!/usr/bin/env bash
    if [ -f "package.json" ]; then
        npm run serve
    else
        python3 -m http.server 8000
    fi

# ===============================================
# テスト・検証
# ===============================================

@test:
    echo "🧪 テストを実行..."
    just test-unit
    just test-lint

test-unit:
    #!/usr/bin/env bash
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        npm test
    elif [ -f "pytest.ini" ] || find . -name "test_*.py" | grep -q .; then
        python3 -m pytest
    else
        echo "ℹ️  テストスクリプトが見つかりません"
    fi

test-lint:
    #!/usr/bin/env bash
    if [ -f "package.json" ]; then
        npm run lint 2>/dev/null || echo "ℹ️  lint スクリプトがありません"
    fi
    
    if command -v pylint &> /dev/null; then
        pylint *.py 2>/dev/null || true
    fi

# ===============================================
# ビルド・デプロイ
# ===============================================

@build:
    echo "🔨 ビルド..."
    just test
    #!/usr/bin/env bash
    if [ -f "package.json" ] && grep -q '"build"' package.json; then
        npm run build
    fi

@deploy: build
    echo "🚀 デプロイ中..."
    #!/usr/bin/env bash
    if [ -f "deploy.sh" ]; then
        bash deploy.sh
    else
        echo "❌ deploy.sh が見つかりません"
        exit 1
    fi

# ===============================================
# GAS（Google Apps Script）
# ===============================================

@gas-login:
    echo "🔐 Google Apps Script にログイン..."
    clasp login

@gas-push:
    echo "📤 GAS にコードをプッシュ..."
    clasp push

@gas-run cmd:
    echo "▶️  関数を実行: {{cmd}}"
    clasp run {{cmd}}

# ===============================================
# Git操作
# ===============================================

@commit msg:
    git add -A
    git commit -m "{{msg}}"
    echo "✅ コミット完了: {{msg}}"

@push:
    #!/usr/bin/env bash
    branch=$(git rev-parse --abbrev-ref HEAD)
    echo "📤 プッシュ: $branch"
    git push -u origin $branch

@pull:
    #!/usr/bin/env bash
    branch=$(git rev-parse --abbrev-ref HEAD)
    echo "📥 プル: $branch"
    git pull origin $branch

# ===============================================
# ヘルプ
# ===============================================

@help:
    echo "📖 使可能なコマンド:"
    echo ""
    just --list
    echo ""
    echo "詳しくは: https://just.systems"
```

---

## 🎯 セクション別の使い方

### セットアップ系
```bash
just setup              # 全セットアップ
just setup-check        # 環境チェック
just install-deps       # 依存をインストール
just init-config        # .env を初期化
```

### 開発系
```bash
just dev                # 開発サーバー + ウォッチを同時起動
just watch              # ファイル変更を監視してビルド
just server             # ローカルサーバーを起動
```

### テスト・検証
```bash
just test               # テスト + lint 実行
just test-unit          # ユニットテストのみ
just test-lint          # リント（コード品質チェック）
```

### ビルド・デプロイ
```bash
just build              # テスト通過後ビルド
just deploy             # ビルド後デプロイ
```

### Google Apps Script
```bash
just gas-login          # GAS にログイン
just gas-push           # コードをプッシュ
just gas-run initSheet  # initSheet 関数を実行
```

### Git
```bash
just commit "メッセージ"  # コミット
just push               # プッシュ
just pull               # プル
```

---

## 📝 プロジェクトに合わせた編集例

### Node.js + TypeScript プロジェクトの場合

以下の部分を追加：

```just
@lint:
    echo "🔍 型チェック..."
    npx tsc --noEmit
    echo "🔍 フォーマット..."
    npx eslint src --fix

@format:
    npx prettier --write "src/**/*.ts"
```

### Python専用プロジェクトの場合

以下に変更：

```just
@dev:
    python3 -m pytest --watch

@test:
    python3 -m pytest
    python3 -m mypy src/

@lint:
    python3 -m black src/
    python3 -m isort src/
```

### Threads自動投稿システムの場合

```just
@gen-posts days:
    echo "📝 {{days}}日分の投稿を生成..."
    python3 scheduler.py --generate --days {{days}}

@post-to-sheet:
    echo "📤 スプシに転記..."
    python3 scheduler.py output/latest.txt --post

@refresh-sheet:
    echo "🔄 スプシをリフレッシュ..."
    python3 -c "import urllib.request, json; \
        resp = urllib.request.urlopen(urllib.request.Request('$(grep webapp_url config.json)', \
        data=json.dumps({'action': 'refresh'}).encode('utf-8'), \
        headers={'Content-Type': 'application/json'}, method='POST')); \
        print(json.loads(resp.read().decode('utf-8')))"
```

---

## 💡 使用例

実際のワークフロー例：

```bash
# プロジェクトをセットアップ
just setup

# 開発を開始
just dev

# テストして問題がないか確認
just test

# コード品質を確認
just lint

# コミット
just commit "新機能: ユーザー認証を追加"

# リモートにプッシュ
just push

# GAS側にもプッシュ（GASを使用する場合）
just gas-push
```

---

## 🔧 インストール方法

### macOS
```bash
brew install just
```

### Windows
```bash
winget install casey.just
```

### Linux
```bash
cargo install just
```

または公式から直接DL: https://github.com/casey/just/releases

---

## ✅ チェックリスト

実装時の確認：

- [ ] `justfile` をプロジェクトルートに置いた
- [ ] `just --version` で動作確認した
- [ ] `just help` でコマンド一覧が表示される
- [ ] `just setup` で初期セットアップが成功した
- [ ] 日常的に使うコマンドをカスタマイズした
- [ ] READMEに `just コマンド` での操作方法を記載した

---

**これでコマンド入力が大幅に削減され、開発効率が3倍になります！**
