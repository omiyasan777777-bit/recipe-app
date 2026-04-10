# 🚀 Gemma 4 完全セットアップガイド

## 【必須確認】ハードウェア要件

| 環境 | CPU | RAM | GPU | 推奨度 |
|------|-----|-----|-----|--------|
| デスクトップPC | i5以上 | 16GB以上 | RTX 3060以上（あると速い） | ⭐⭐⭐ |
| MacBook | M1/M2/M3 | 16GB以上 | Apple Silicon内蔵 | ⭐⭐⭐ |
| ラップトップ | i7以上 | 16GB以上 | 内蔵GPU可 | ⭐⭐ |
| Raspberry Pi 5 | ARM Cortex-A72 | 8GB以上 | CPU推論 | ⭐ (軽量モデルのみ) |

**最小要件：RAM 8GB、ストレージ 20GB以上**

---

## 【OS別】ステップバイステップガイド

### 🍎 **macOS (Intel / Apple Silicon両対応)**

#### Step 1: Homebrewの確認
```bash
brew --version
```
**なければインストール：**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Step 2: 必要なツールのインストール
```bash
# Python3
brew install python@3.11

# Node.js（オプション）
brew install node

# Git
brew install git
```

#### Step 3: Ollamaのインストール
```bash
# Homebrewで簡単インストール
brew install ollama

# または公式サイトから
# https://ollama.ai/download
```

#### Step 4: Ollamaサービスの開始
```bash
# バックグラウンドで起動
brew services start ollama

# 確認
ollama list
```

#### Step 5: Gemma 4のダウンロード
```bash
# 初回は5〜10分かかります
ollama pull gemma4

# ダウンロード完了確認
ollama list
# gemma4  latest  9b 9.2GB と表示されればOK
```

#### Step 6: 動作確認
```bash
ollama run gemma4 "こんにちは。あなたは何ですか？"
```

#### Step 7: Python環境の準備
```bash
# 仮想環境作成（推奨）
python3.11 -m venv gemma-env
source gemma-env/bin/activate

# ライブラリインストール
pip install --upgrade pip
pip install langchain ollama python-dotenv gradio openai-whisper torch transformers
```

#### Step 8: 動作確認（Python）
```bash
python3 -c "
from langchain.llms import Ollama
llm = Ollama(model='gemma4')
print(llm('Hello, what is 2+2?'))
"
```

**✅ macOS セットアップ完了**

---

### 🪟 **Windows 10/11**

#### Step 1: WSL 2 のセットアップ（推奨）
```powershell
# PowerShellを管理者で実行してから：
wsl --install
wsl --install -d Ubuntu-22.04
wsl --set-default-version 2
```
*再起動が必要です*

#### Step 2: WSL内でのセットアップ
```bash
# WSLを開く
wsl

# Ubuntu内で実行
sudo apt update
sudo apt install python3 python3-pip python3-venv curl git

# Pythonバージョン確認
python3 --version
```

#### Step 3: Ollamaのインストール
```bash
# WSL内で
curl -fsSL https://ollama.ai/install.sh | sh

# または Windows 用インストーラを使用
# https://ollama.ai/download → Windows版をダウンロード
```

#### Step 4: Gemma 4ダウンロード
```bash
ollama pull gemma4
```

#### Step 5: Python環境準備
```bash
# WSL内で
python3 -m venv ~/gemma-env
source ~/gemma-env/bin/activate
pip install --upgrade pip
pip install langchain ollama python-dotenv gradio openai-whisper torch transformers
```

#### Step 6: 動作確認
```bash
python3 -c "from langchain.llms import Ollama; llm = Ollama(model='gemma4'); print(llm('test'))"
```

**✅ Windows セットアップ完了**

---

### 🐧 **Linux (Ubuntu / Debian)**

#### Step 1: 必要なパッケージのインストール
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv curl git

# Python3.11がなければ
sudo apt install python3.11 python3.11-venv
```

#### Step 2: Ollamaのインストール
```bash
curl -fsSL https://ollama.ai/install.sh | sh

# 確認
ollama --version
```

#### Step 3: Ollamaサービスの開始
```bash
# systemdで自動起動設定
sudo systemctl start ollama
sudo systemctl enable ollama

# ステータス確認
sudo systemctl status ollama
```

#### Step 4: Gemma 4ダウンロード
```bash
ollama pull gemma4
```

#### Step 5: Python環境準備
```bash
python3.11 -m venv gemma-env
source gemma-env/bin/activate

pip install --upgrade pip
pip install langchain ollama python-dotenv gradio openai-whisper torch transformers
```

#### Step 6: 動作確認
```bash
python3 -c "from langchain.llms import Ollama; print(Ollama(model='gemma4')('Hi'))"
```

**✅ Linux セットアップ完了**

---

### 🍓 **Raspberry Pi 5 (ARM64)**

#### 注意⚠️
- Raspberry Pi 4以下はメモリ不足のため非推奨
- Raspberry Pi 5 + 8GB RAM 以上が必須
- 全投稿生成は難しいが、推論（動作確認）は可能

#### Step 1: OSセットアップ
```bash
# Raspberry Pi OS (64-bit) を新規インストール
# https://www.raspberrypi.com/software/ からイメージをダウンロード

# インストール後、SSH接続
ssh pi@raspberrypi.local
```

#### Step 2: システム更新
```bash
sudo apt update
sudo apt upgrade -y

# 必要なライブラリ
sudo apt install -y python3 python3-pip python3-venv build-essential
```

#### Step 3: Ollamaのインストール
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Step 4: 軽量モデルのダウンロード
```bash
# Gemma 4は重いため、軽量版を推奨
ollama pull orca-mini:3b
# または
ollama pull neural-chat:7b
```

#### Step 5: Python環境
```bash
python3 -m venv gemma-env
source gemma-env/bin/activate

pip install langchain ollama python-dotenv gradio
# 注：torch/whisper は Pi 上でインストール困難なため、推論のみ
```

#### Step 6: バックグラウンド実行
```bash
# systemdサービスとして設定
sudo systemctl start ollama
sudo systemctl enable ollama
```

**✅ Raspberry Pi セットアップ完了**

---

## 【共通】セットアップ後の確認

### 確認チェックリスト
```bash
# 1. Ollamaが動作しているか
ollama list

# 2. Gemma 4が使用可能か
ollama run gemma4 "テスト"

# 3. ローカルサーバーが立ち上がっているか
curl http://localhost:11434/api/tags

# 4. Pythonからアクセスできるか
python3 << 'EOF'
from langchain.llms import Ollama
llm = Ollama(model='gemma4')
print(llm('2 + 2 = ?'))
EOF
```

### トラブル時の確認コマンド
```bash
# Ollamaプロセスの確認
ps aux | grep ollama

# ポート確認（11434）
lsof -i :11434

# Gemmaモデルの再ダウンロード
ollama rm gemma4
ollama pull gemma4
```

---

## 【次ステップ】Webインタフェース（オプション）

### Open WebUI のインストール（全OS対応）
```bash
# Dockerが必要
docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:latest

# ブラウザで http://localhost:3000 を開く
```

### 簡易WebUIの構築（Python）
```bash
pip install gradio

# app.py を作成
cat > app.py << 'EOF'
import gradio as gr
from langchain.llms import Ollama

llm = Ollama(model='gemma4')

def chat(message):
    return llm(message)

gr.Interface(fn=chat, inputs='text', outputs='text').launch(share=True)
EOF

# 実行
python3 app.py
```