# 🎁 特典②：CLAUDE.md記述テンプレート

**プロジェクトにこのテンプレートを置くだけで、毎回の説明が不要になり、トークン消費が50%削減されます。**

---

## CLAUDE.md とは？

プロジェクトルートに置く、Claude Code用の説明ファイル。
- プロジェクト概要
- 技術スタック
- コーディング規約
- 禁止事項
- 優先事項

をまとめておくことで、毎回の依頼時に説明を省略できます。

---

## 📋 テンプレート（汎用版）

以下をコピーして `CLAUDE.md` という名前でプロジェクトルートに置いてください。

```markdown
# プロジェクト概要

**プロジェクト名**: [プロジェクト名]
**目的**: [何のプロジェクトか？1〜2文]
**メンテナー**: [担当者名]
**最終更新**: [日付]

---

## 🏗️ アーキテクチャ・技術スタック

### フロントエンド
- **フレームワーク**: [React / Vue / Svelte など]
- **言語**: [TypeScript / JavaScript]
- **ビルド**: [Vite / Webpack など]
- **スタイリング**: [Tailwind / CSS-in-JS など]
- **状態管理**: [Zustand / Redux など]

### バックエンド
- **ランタイム**: [Node.js / Python など]
- **フレームワーク**: [Express / Django / FastAPI など]
- **データベース**: [PostgreSQL / MongoDB など]
- **API**: [REST / GraphQL]

### インフラ
- **ホスティング**: [Vercel / AWS / GCP など]
- **CI/CD**: [GitHub Actions / GitLab CI など]
- **環境管理**: [Docker / Docker Compose]

### 開発ツール
- **エディタ**: VS Code 推奨
- **パッケージ管理**: [npm / yarn / pnpm]
- **ビルドツール**: [Just / Make / npm scripts]
- **テスト**: [Jest / Vitest / pytest など]
- **リント**: [ESLint / Prettier / Ruff など]

---

## 📁 ディレクトリ構成

```
project-root/
├── CLAUDE.md                  ← このファイル
├── README.md                  ← ユーザー向けドキュメント
├── package.json
├── justfile                   ← コマンドショートカット
├── src/
│   ├── components/            ← UI部品（フロント）
│   ├── pages/                 ← ページ（フロント）
│   ├── api/                   ← API定義（バック）
│   ├── utils/                 ← ユーティリティ関数
│   └── types/                 ← TypeScript型定義
├── tests/                     ← テストファイル
├── public/                    ← 静的ファイル
├── .github/workflows/         ← CI/CD設定
└── docs/                      ← ドキュメント
```

---

## 🎨 コーディング規約

### 一般的なルール
- **ファイル名**: `kebab-case`（例: `user-profile.tsx`）
- **変数名**: `camelCase`（例: `userName`）
- **定数名**: `UPPER_SNAKE_CASE`（例: `API_BASE_URL`）
- **クラス名**: `PascalCase`（例: `UserProfile`）
- **関数名**: `camelCase`（例: `getUserProfile`）

### コメント
- 「何をするか」は書かない（コードを読めば分かる）
- 「なぜそうするのか」「なぜそれ以外は駄目なのか」を書く
- 1行コメントは `//`、複数行は `/* */`

**例：**
```typescript
// ❌ 悪い例
// userを宣言
const user = await getUser(id);

// ✅ 良い例
// ID検証後に取得。キャッシュはredisで管理（TTL 1h）
const user = await getUser(id);
```

### インポート順序
```typescript
// 1. 標準ライブラリ
import fs from 'fs';
import path from 'path';

// 2. 外部ライブラリ
import React from 'react';
import axios from 'axios';

// 3. 内部モジュール
import { User } from '@/types/user';
import { api } from '@/utils/api';

// 4. CSS・スタイル
import styles from './component.module.css';
```

### 関数の制限
- **1関数は50行以下** — 長い場合は分割する
- **引数は3個以下** — 多い場合はオブジェクト化する
- **ネストは3段階まで** — それ以上は早期リターンで平坦化する

### TypeScript
- 暗黙の `any` は禁止
- 未使用の変数は削除
- 型アノテーションは必須（JSDocでもOK）

---

## ✅ 重要な方針

### 1. 過度な抽象化禁止
- 1回限りの操作は専用コードを書く
- 「将来のため」の実装はしない
- 3回目の重複が出るまで関数化しない

### 2. テスト駆動開発（TDD）は強制しない
- 自分がテストできるなら書く
- UIコンポーネントはテスト自体が困難
- テストできない部分は無理に書かない

### 3. エラーハンドリング
- システムバウンダリ（ユーザー入力、API）での検証は必須
- 内部コード間の検証は信頼する
- 起こり得ない場合の処理は書かない

### 4. ドキュメント
- README は ユーザー向け
- CLAUDE.md は開発者（Claude）向け
- コード内コメントは「判断根拠」

---

## 🚀 デプロイ・ビルド

### 開発環境
```bash
just dev
```

### ビルド・本番環境
```bash
just build      # ビルド + テスト
just deploy     # デプロイ
```

### テスト
```bash
just test       # 全テスト
just test-unit  # ユニットテストのみ
```

### 環境変数
- `.env` をローカルに配置（Gitには含めない）
- プロダクション変数は `config.json` で管理

**例: .env**
```
VITE_API_BASE_URL=http://localhost:3000
VITE_DEBUG=true
```

---

## ⚠️ 禁止事項

以下は絶対にしないこと：

- [ ] `git reset --hard` などの破壊的操作
- [ ] プロダクション環境への無許可デプロイ
- [ ] 秘密鍵・APIキーをコードに埋め込む
- [ ] 未テストのコードを本番にマージ
- [ ] 他人のブランチを許可なく編集
- [ ] `.env` や `config.json` をGitにコミット

---

## 🔄 Git ワークフロー

### ブランチ戦略
- `master`: 本番環境。直接コミット禁止。PRレビュー必須
- `develop`: 開発メイン。ここからフィーチャーブランチを切る
- `feature/*`: 機能開発。`develop` から切って、PRでマージ

### コミットメッセージ
```
[type]: 簡潔な説明

詳細な説明が必要な場合は、ここに書く
- 何をしたか
- なぜしたか
- 関連するissue番号

type: feat / fix / refactor / docs / style / test / chore
```

**例:**
```
fix: ユーザーログイン時の日本語エラー表示

日本語フォントの非読み込みにより、エラーメッセージが?????と表示されていた。
CJKフォント事前読み込みで修正。

Closes #123
```

---

## 👥 対応方針

### レビューコメントへの返答
- 「そこはこういう理由」と説明する
- 修正が必要なら即修正
- 意見対立はメンテナーに判断を委ねる

### バグ報告
- 再現手順を聞く
- 環境情報を確認
- UIバグなら動画で説明してもらう

### パフォーマンス問題
- 計測してから修正（予測で最適化しない）
- キャッシング前にボトルネックを特定

---

## 📚 参考リンク

- [プロジェクトWiki](URL)
- [API ドキュメント](URL)
- [デザインシステム](URL)
- [インフラ構成図](URL)

---

## 📝 チェックリスト（新規開発者向け）

セットアップ時に確認：

- [ ] このファイル（CLAUDE.md）を読んだ
- [ ] `git clone` でプロジェクトを複製した
- [ ] `just setup` でセットアップを完了した
- [ ] `just test` でテストがすべて通る
- [ ] `just dev` で開発環境が起動する
- [ ] `.env` をローカルに配置した
- [ ] READMEを読んだ
- [ ] 最初のタスクが理解できた

---

**このファイルは生きたドキュメント。更新があれば随時修正してください。**
```

---

## 🎯 プロジェクト別テンプレート

### 📱 React + TypeScript プロジェクト用

以下を追加：

```markdown
## React特有のルール

### コンポーネント設計
- 1ファイル = 1コンポーネント
- ステートレスコンポーネントをデフォルトに
- useStateより useReducer を優先
- useEffect は依存配列を明示的に書く

### hooks
```typescript
// ❌ 禁止: 条件分岐内でのhooks使用
if (isLoggedIn) {
  const [user] = useState();  // 危険！
}

// ✅ OK: トップレベルで常に実行
const [user] = useState();
if (isLoggedIn) {
  // user を使う
}
```

### パフォーマンス
- リスト表示は virtualizer（TanStack Virtual等）で対応
- 重い計算は useMemo でメモ化
- 過度な useCallback はしない（デフォルトでOK）
```

### 🐍 Python + FastAPI プロジェクト用

```markdown
## Python特有のルール

### コード品質
- 型ヒントは必須（mypy で検証）
- docstring は Google形式
- テストカバレッジは 80% 以上

### 非同期処理
```python
# ❌ 同期でDB呼び出し
async def get_user(id):
    user = db.query(User).get(id)  # ブロックする

# ✅ 非同期で呼び出し
async def get_user(id):
    user = await db.get(User, id)
```

### 環境構築
- Python 3.11+
- 仮想環境は `venv` で作成
- 依存は `requirements.txt` + `requirements-dev.txt` で管理
```

### 🔧 GAS（Google Apps Script）プロジェクト用

```markdown
## Apps Script特有のルール

### コード実行
- オンラインで実行（clasp run）
- GASのAPI実行デプロイが必須
- 関数は Executable デプロイで実行可能にする

### Pro と Free の違い
- Pro（$20/月）: 実行時間上限 ↑、トリガー数 ↑
- 大量投稿 or 複雑な処理は Pro 推奨

### セキュリティ
- `PropertiesService` に秘密鍵を保存
- コードに API キーを埋め込まない
- Web App デプロイは「全員」で許可範囲広め
```

---

## ✨ これを置くだけで：

✅ **新規開発者の学習時間が50%短縮**
✅ **毎回の説明が不要（トークン削減）**
✅ **コーディングルール一貫性が向上**
✅ **レビュー時間が削減**
✅ **バグの事前防止**

---

**プロジェクトごとにカスタマイズして、チーム全体の効率を上げましょう！**
