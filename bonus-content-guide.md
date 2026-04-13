# 📖 特典ファイル — 保存場所と見る方法

記事を読んでくださった皆様へ、3つの特典ファイルの **保存場所と確認方法** をまとめました。

---

## 📁 ファイルの保存場所

すべての特典ファイルは **GitHub リポジトリ** に保存されています。

### リポジトリ
```
https://github.com/omiyasan777777-bit/recipe-app
```

### 特典ファイルのパス
```
recipe-app/
├── bonus-content-00-main.md                    ← メインページ（案内）
├── bonus-content-01-justfile-template.md       ← 🎁 特典①
├── bonus-content-02-claude-md-template.md      ← 🎁 特典②
├── bonus-content-03-cost-calculation-sheet.md  ← 🎁 特典③
└── bonus-content-guide.md                      ← このファイル（見方）
```

---

## 🖥️ ファイルを見る方法

### 方法1：GitHub で直接見る（ブラウザ）— 最も簡単

#### Step 1: リポジトリにアクセス
```
https://github.com/omiyasan777777-bit/recipe-app
```

#### Step 2: ファイルをクリック
上記のファイル一覧から、見たいファイルをクリックするだけです。

**例：特典①を見たい場合**
```
bonus-content-01-justfile-template.md をクリック
→ ブラウザでMarkdown が見やすく表示されます
```

#### Step 3: コピペする
ファイルの内容が表示されたら：
- 右上の「Copy」ボタン で全文コピー
- または、ブラウザで Cmd+A で全選択して Cmd+C でコピー
- note に貼り付け

**メリット：**
- ✅ インストール不要
- ✅ ブラウザだけで完結
- ✅ Markdown が見やすく表示される
- ✅ スマホでも見られる

---

### 方法2：ローカルで Clone してから見る（コマンドライン）

#### Step 1: リポジトリを複製
```bash
git clone https://github.com/omiyasan777777-bit/recipe-app.git
cd recipe-app
```

#### Step 2: ファイルの内容を表示

**全文を表示：**
```bash
cat bonus-content-01-justfile-template.md
```

**ページ送りで見る（長いファイル向け）：**
```bash
less bonus-content-01-justfile-template.md
# 「q」キーで終了
# スペースキーでページ送り
# 「/」で検索
```

**最初の 50行だけ見る：**
```bash
head -50 bonus-content-01-justfile-template.md
```

**最後の 20行だけ見る：**
```bash
tail -20 bonus-content-01-justfile-template.md
```

**メリット：**
- ✅ ローカルで編集・カスタマイズできる
- ✅ 検索がしやすい
- ✅ 複数ファイルを一度に処理できる

---

### 方法3：テキストエディタで開く（最も編集しやすい）

#### Step 1: Clone（方法2と同じ）
```bash
git clone https://github.com/omiyasan777777-bit/recipe-app.git
cd recipe-app
```

#### Step 2: エディタで開く

**Mac（デフォルトエディタ）：**
```bash
open bonus-content-01-justfile-template.md
```

**VS Code：**
```bash
code bonus-content-01-justfile-template.md
```

**Sublime Text：**
```bash
subl bonus-content-01-justfile-template.md
```

**vim / nano：**
```bash
vim bonus-content-01-justfile-template.md
# または
nano bonus-content-01-justfile-template.md
```

**メリット：**
- ✅ 編集可能
- ✅ シンタックスハイライトで見やすい
- ✅ プロジェクトに組み込みやすい

---

## 📋 各ファイルの説明

### 📄 `bonus-content-00-main.md` — メインページ（案内）

**内容：**
- 3つの特典の役割と効果
- 導入方法（3ステップ）
- 期待できるリターン
- よくある質問

**用途：**
- note 記事の **最後に貼り付ける**
- 読者を3つの特典へ誘導する

**ファイルサイズ：** 約 400行（読了時間 8分）

---

### 🎁 `bonus-content-01-justfile-template.md` — Justfileテンプレート

**内容：**
- すぐコピペできる Justfile 本体
- セクション別コマンド解説
- OS別インストール手順
- プロジェクト別カスタマイズ例

**用途：**
- プロジェクトに `justfile` として保存
- または、note の「特典①」セクションに掲載

**ファイルサイズ：** 約 350行（読了時間 10分）

**コマンド例が豊富：**
```just
just setup
just dev
just test
just deploy
just gas-push
just commit "メッセージ"
```

---

### 🎁 `bonus-content-02-claude-md-template.md` — CLAUDE.mdテンプレート

**内容：**
- プロジェクト概要テンプレート
- 技術スタック（フロント・バック・インフラ）
- コーディング規約（10項目）
- 禁止事項（8項目）
- Git ワークフロー

**用途：**
- プロジェクトに `CLAUDE.md` として保存
- または、note の「特典②」セクションに掲載

**ファイルサイズ：** 約 450行（読了時間 12分）

**カスタマイズ例：**
- React + TypeScript
- Python + FastAPI
- Google Apps Script

---

### 🎁 `bonus-content-03-cost-calculation-sheet.md` — コスト試算シート

**内容：**
- APIキー vs Pro の月額費用比較
- トークン消費量の実例計算
- 人件費削減試算
- 年間 ROI 計算
- 落とし穴ケース（高額請求の事例）

**用途：**
- Pro 切り替え判断の根拠に
- または、note の「特典③」セクションに掲載
- チームメンバーを説得する資料に

**ファイルサイズ：** 約 400行（読了時間 10分）

**数字の具体例：**
- 月300投稿：年間 $4,210 削減
- 人件費削減で月¥51,000相当

---

## 🎯 推奨される見方と掲載方法

### 👁️ まず見る順序

```
Step 1: bonus-content-00-main.md
        ↓
        （全体像を理解）
        ↓
Step 2: 興味のある特典を見る
        ├─ bonus-content-01-justfile-template.md
        ├─ bonus-content-02-claude-md-template.md
        └─ bonus-content-03-cost-calculation-sheet.md
```

### 📝 note に掲載する手順

**準備：GitHub で全ファイルを確認**
```
1. GitHub リポジトリを開く
2. 各ファイルをプレビュー
3. 内容を理解する
```

**執筆：note に組み込む**
```
【記事本体】
「Claude Code 自動化マスター」の メイン記事

【特典紹介セクション】
bonus-content-00-main.md をコピペ
↓
3つの特典を紹介する部分が自動生成される

【各特典の詳細セクション】

## 🎁 特典①
bonus-content-01-justfile-template.md をコピペ

## 🎁 特典②
bonus-content-02-claude-md-template.md をコピペ

## 🎁 特典③
bonus-content-03-cost-calculation-sheet.md をコピペ
```

**公開**
```
note で公開
↓
読者が GitHub リポジトリにアクセス
↓
ファイルをコピーして実装
```

---

## 🔗 直リンク（クリックですぐアクセス）

### GitHub（ブラウザで見る — 最も簡単）

**メインページ（案内）**
```
https://github.com/omiyasan777777-bit/recipe-app/blob/master/bonus-content-00-main.md
```

**特典①：Justfileテンプレート**
```
https://github.com/omiyasan777777-bit/recipe-app/blob/master/bonus-content-01-justfile-template.md
```

**特典②：CLAUDE.mdテンプレート**
```
https://github.com/omiyasan777777-bit/recipe-app/blob/master/bonus-content-02-claude-md-template.md
```

**特典③：コスト試算シート**
```
https://github.com/omiyasan777777-bit/recipe-app/blob/master/bonus-content-03-cost-calculation-sheet.md
```

---

## 📱 スマートフォンで見る方法

### ブラウザを使う（最も簡単）

```
1. 上記の GitHub URL をタップ
2. ファイルがブラウザに表示される
3. スクロールして内容を確認
4. 共有ボタンで note に貼り付け
```

### GitHub アプリを使う

```
1. GitHub アプリをインストール
2. リポジトリを開く
3. ファイルをタップ
4. 内容を確認
```

---

## ❓ よくある質問

### Q1: ファイルをダウンロードできる？
**A:** はい。GitHub の各ファイルページで、右上の「⋯」メニュー → 「Download raw file」をクリックするとダウンロードできます。

### Q2: ローカルにクローンしなくても見られる？
**A:** はい。GitHub のブラウザ表示だけで十分です。ブラウザ → コピペ → note 貼り付けで完結します。

### Q3: 複数ファイルを一度にダウンロードできる？
**A:** はい。リポジトリの右上の「Code」ボタン → 「Download ZIP」で全ファイルをダウンロードできます。

### Q4: Mac のターミナルで見るには？
**A:** 
```bash
git clone https://github.com/omiyasan777777-bit/recipe-app.git
cd recipe-app
less bonus-content-01-justfile-template.md
```

### Q5: ファイルを編集して、自分のプロジェクトに合わせたい
**A:** Clone して、ローカルの `bonus-content-*.md` をテキストエディタで編集してください。

---

## 🚀 次のステップ

### ✅ 今すぐできること

1. **GitHub で見る**
   ```
   https://github.com/omiyasan777777-bit/recipe-app
   ```

2. **気に入った特典をコピー**
   - GitHub のファイルページで「Copy」ボタン
   - または、Cmd+A → Cmd+C

3. **note に貼り付け**
   - 記事の該当セクションに貼り付け

### 📊 導入スケジュール例

```
【即座】（今日）
- ファイルを確認
- note に掲載

【1週間以内】
- 特典①（Justfile）を導入
- 毎日のコマンドが楽に

【2週間以内】
- 特典②（CLAUDE.md）をカスタマイズ
- チーム全体で効率化

【1ヶ月以内】
- 特典③（コスト試算）で Pro 切り替え判断
- 月額費用を削減
```

---

## 📞 サポート

### 不具合・質問
GitHub Issues: 
```
https://github.com/omiyasan777777-bit/recipe-app/issues
```

### よくあるエラー

**「ファイルが見つかりません」**
→ GitHub URL を確認。`blob/master/` の後に正しいファイル名が入ってるか確認

**「コピペしたらフォーマットが崩れた」**
→ note の「Markdown」モードで貼り付けてください

**「Justfile のインストールができない」**
→ https://just.systems を参照

---

## ✨ 最後に

このガイドで、すべての特典ファイルへ **どこからでもアクセス** できるようになりました。

- ✅ ブラウザだけで見られる
- ✅ スマホでも見られる
- ✅ コピペして note に掲載できる
- ✅ ローカルで編集・カスタマイズできる

**ぜひ活用して、開発効率を高めてください！** 🚀

---

**質問・フィードバックは、GitHub Issues でお待ちしています。** 📬
