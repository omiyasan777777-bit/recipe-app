# ✅ セットアップ＆操作チェックリスト

セットアップ後、本格運用を始める前に、すべての項目をチェックしてください。

---

## Phase 1: 環境準備

- [ ] Python 3.8 以上がインストールされている
  ```bash
  python3 --version  # 出力: Python 3.10.5 など
  ```

- [ ] Node.js がインストールされている
  ```bash
  node --version  # 出力: v16.14.0 など
  ```

- [ ] npm パッケージがインストールされている
  ```bash
  npm --version
  ```

- [ ] clasp がインストールされている
  ```bash
  clasp --version
  ```

- [ ] Python パッケージがインストールされている
  ```bash
  pip list | grep pyperclip  # pyperclip と requests が表示される
  ```

---

## Phase 2: Google 連携

- [ ] `clasp login` で認証完了している
  ```bash
  clasp login --status  # 「logged in」と表示される
  ```

- [ ] Google スプレッドシートが作成されている
  ```bash
  # clasp open でブラウザに表示される
  ```

- [ ] `.clasp.json` ファイルが存在する
  ```bash
  ls -la nuko-threads/.clasp.json
  ```

- [ ] `.clasp.json` に `rootDir` が設定されている
  ```bash
  cat nuko-threads/.clasp.json | grep rootDir
  ```

- [ ] `appscript.gs` と `appsscript.json` が存在する
  ```bash
  ls -la nuko-threads/{appscript.gs,appsscript.json}
  ```

- [ ] `clasp push` でコードがアップロードされている
  ```bash
  cd nuko-threads && clasp push
  ```

- [ ] Web App がデプロイされている
  ```bash
  # clasp open でブラウザを開き、「デプロイ」を確認
  ```

- [ ] Web App URL が取得できている
  ```bash
  # https://script.google.com/macros/d/xxxxx/usercontent
  ```

---

## Phase 3: 設定ファイル

- [ ] `config.json` が存在する
- [ ] `config.json` の JSON 形式が正しい
- [ ] `config.json` に `spreadsheet_url` が設定されている
- [ ] `config.json` に `webapp_url` が設定されている
- [ ] `config.json` に `webapp_key` が設定されている
- [ ] `config.json` に `start_date` が設定されている
- [ ] `config.json` に `posting_hours` が設定されている

---

## Phase 4: コンテンツファイル

- [ ] `content/strategy.md` が存在して記入されている
  - [ ] ペルソナが明確（年代、性別、悩み）
  - [ ] コンセプトが 1 文で書かれている
  - [ ] 語彙リストが 5 個以上

- [ ] `content/rules.md` が存在して記入されている
  - [ ] 基本ルールが書かれている
  - [ ] 高成約パターンが 2 個以上
  - [ ] 低成約パターン（避けるもの）が記載

- [ ] `content/structures.md` が存在する

---

## Phase 5: ダッシュボード

- [ ] `asp-affiliate-tool/data.json` が存在する
- [ ] `asp-affiliate-tool/standalone-viewer.html` が存在する
- [ ] ダッシュボードがブラウザで開ける
- [ ] ダッシュボードに 7 つのタブが表示される

---

## Phase 6: テスト実行

- [ ] テスト投稿が生成できる
  ```bash
  cd nuko-threads
  python scheduler.py output/batch_0001.txt --clipboard
  ```

- [ ] `output/batch_0001.txt` が作成されている
- [ ] 生成内容が strategy.md に沿っている
- [ ] 投稿をスプシに転記できる
  ```bash
  python scheduler.py output/batch_0001.txt --post
  ```

- [ ] スプシに 10 行以上のデータが追加されている
- [ ] post_id が記録されている（I 列）

---

## Phase 7: ファイル構成

すべてのファイルが揃っているか確認：

```
threads-asp-system/
├── README.md ✅
├── SETUP_GUIDE.md ✅
├── OPERATION_GUIDE.md ✅
├── TROUBLESHOOT_GUIDE.md ✅
├── CHECKLIST.md ✅
│
├── config.json ✅
├── templates/
│   ├── config-template.json ✅
│   ├── rules-template.md ✅
│   └── strategy-template.md ✅
│
├── nuko-threads/
│   ├── config.json ✅
│   ├── scheduler.py ✅
│   ├── content/
│   │   ├── strategy.md ✅
│   │   ├── rules.md ✅
│   │   └── structures.md ✅
│   └── output/
│       └── batch_0001.txt ✅
│
└── asp-affiliate-tool/
    ├── data.json ✅
    ├── index.html ✅
    └── standalone-viewer.html ✅
```

---

## 本格運用スタート！

すべてにチェックが入ったら、本格運用を開始できます。

OPERATION_GUIDE.md を読んで、毎日の操作を学びましょう！

