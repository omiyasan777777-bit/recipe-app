# ⚡ Gemma 4 クイックリファレンス

## コマンド一覧（コピペ用）

### セットアップ（1回だけ）
```bash
# インストール
brew install ollama                    # macOS
curl -fsSL https://ollama.ai/install.sh | sh  # Linux

# モデルダウンロード
ollama pull gemma4

# 動作確認
ollama run gemma4 "テスト"
```

### Python 最小コード
```python
from langchain.llms import Ollama
llm = Ollama(model='gemma4')
print(llm("質問"))
```

### 日報 AI（建設業）
```bash
python3 construction_daily_report.py
```

### 議事録 AI
```bash
python3 meeting_minutes_ai.py
```

### 翻訳メディア
```bash
python3 auto_translation_media.py
```

### チャットボット UI
```bash
python3 local_chatbot_ui.py
# → http://localhost:7860 を開く
```

### 受付ロボット（Raspberry Pi）
```bash
python3 reception_robot.py
```

---

## トラブル対応早見表

| 症状 | コマンド |
|------|---------|
| Ollamaが起動しない | `brew services start ollama` |
| モデルが見つからない | `ollama pull gemma4` |
| Python が遅い | `ollama rm gemma4; ollama pull orca-mini:3b` |
| メモリ不足 | `export OLLAMA_NUM_PARALLEL=1` |
| 完全リセット | `ollama rm gemma4; ollama cache clear` |

---

## ビジネス別ファイル構成

```
Gemma4-Business/
├── construction_daily_report.py      # 建設業
├── medical_assistant.py              # 医療
├── meeting_minutes_ai.py             # 議事録
├── auto_translation_media.py         # 翻訳メディア
├── local_chatbot_ui.py               # チャットボット
├── reception_robot.py                # 受付ロボット
├── output/
│   ├── reports/                      # 生成ファイル保存
│   └── logs/                         # ログ
└── config.json                       # 設定ファイル
```

---

## 営業用ピッチテンプレート（30秒版）

### 建設業向け
```
「現場の日報、毎日手書きですか？
実は、音声で話しかけるだけで日報が自動生成される
システムがあるんです。

月9,800円で導入でき、現場監督の事務作業が50%削減できます」
```

### 医療向け
```
「患者情報をクラウドに送るのはセキュリティリスク。
でも、社内PCだけで動くAIなら安全です。

診察メモ自動生成で記録時間が40%削減、月額29,800円です」
```

### 企業全体向け
```
「毎回の会議で議事録作成に時間がかかってませんか？
音声から自動でアクション項目も抽出。

完全ローカルなので情報漏洩の心配なし。月29,800円です」
```

---

## 環境構築チェックリスト

- [ ] Ollama インストール済み
- [ ] Gemma 4 ダウンロード済み
- [ ] Python 3.11+ インストール済み
- [ ] 仮想環境構築済み
- [ ] ライブラリインストール完了
- [ ] テスト実行成功

**全てチェック済みなら準備OK！**

---

## 月額課金ビジネス料金設定ガイド

| ビジネスモデル | 推奨価格 | 最小企業数 | 月額目標 |
|---|---|---|---|
| 業界特化AIツール | ¥9,800 | 10社 | ¥98,000 |
| 議事録AI | ¥5,000 | 20社 | ¥100,000 |
| コンサル（AIエージェント） | ¥50,000 | 4社 | ¥200,000 |
| テンプレート販売 | ¥4,980 | 20本 | ¥99,600 |

---

## 初期営業活動（Week 1）

1. ターゲット企業リスト作成（20社）
2. LinkedIn メッセージ送信（1日2〜3社）
3. メール営業開始（1日1社）
4. 紹介経由営業（既知の人脈5人に連絡）

**目標：トライアル申し込み3件 / 初受注1件**

---

## ROI計算テンプレート

```
年間削減額：¥ _____,000
年間コスト：¥ ___,600
純利益：   ¥ _____,400

ROI：____%
```

---

## よくある質問（FAQ）

**Q: プログラミング未経験でもできる？**
A: 提供するコードはそのまま使えます。ただしカスタマイズには Python の基礎知識が必要です。

**Q: セキュリティは大丈夫？**
A: ローカル実行のため、データは PC 内に留まります。最高のセキュリティです。

**Q: 導入後のサポートは？**
A: 3ヶ月の無料サポート + 月額サポートプラン（¥9,800/年）

**Q: 複数企業への展開は？**
A: 各企業で独立した環境として動作します。パートナー展開も可能。

---

## 次のステップ

1. **Week 1**: セットアップ + 市場調査
2. **Week 2**: プロトタイプ完成 + デモ作成
3. **Week 3**: 営業資料 + 営業開始
4. **Week 4**: 初受注取得

**目標：30日以内に初受注 ¥50,000**