# 🔧 トラブルシューティング完全版

## エラー別解決ガイド

### 1️⃣ **インストール・初期化エラー**

#### ❌ `ollama: command not found`
**原因**: Ollamaがインストールされていないか、PATHが通っていない

**解決方法**:
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# https://ollama.ai/download から exe をインストール

# インストール後
exec $SHELL  # シェルを再起動
ollama --version  # 確認
```

---

#### ❌ `Error: model not found` / `gemma4 not found`
**原因**: Gemma 4をダウンロードしていない

**解決方法**:
```bash
# ダウンロード開始（初回は10分程度）
ollama pull gemma4

# ダウンロード進捗を確認
ollama list

# 強制的に再ダウンロード
ollama rm gemma4
ollama pull gemma4
```

---

#### ❌ `Failed to connect to the server`
**原因**: Ollamaサーバーが起動していない

**解決方法**:
```bash
# macOS（Homebrewで起動）
brew services start ollama

# Linux（systemdで起動）
sudo systemctl start ollama
sudo systemctl enable ollama  # 自動起動設定

# Windows（GUIアプリを起動）
# Ollama.exeをダブルクリック

# 確認
curl http://localhost:11434/api/tags
```

---

### 2️⃣ **メモリ・パフォーマンスエラー**

#### ❌ `CUDA out of memory` / `Out of memory`
**原因**: PCのメモリが足りない

**解決方法**:
```bash
# 1. 軽量モデルに切り替える
ollama pull orca-mini:3b
ollama run orca-mini:3b

# 2. バックグラウンドアプリを閉じる
# Task Manager（Windows）やActivity Monitor（Mac）で
# 不要なアプリを終了

# 3. メモリを確認
# macOS
vm_stat

# Linux
free -h

# Windows
Get-ComputerInfo -Property OsTotalVisibleMemorySize
```

---

#### ❌ `Response time too slow` / 非常に遅い
**原因**: GPUが使われていない、またはスペック不足

**解決方法**:
```bash
# 1. GPU対応を確認
ollama list  # VRAM情報を確認

# 2. CPU最適化を有効化
export OLLAMA_NUM_PARALLEL=1  # 並列処理を1に制限

# 3. より軽量なモデルを使用
ollama pull neural-chat:7b
```

---

### 3️⃣ **Python・ライブラリエラー**

#### ❌ `ModuleNotFoundError: No module named 'langchain'`
**原因**: langchainがインストールされていない

**解決方法**:
```bash
# 仮想環境を使っているか確認
which python3  # 仮想環境内なら ~/.../gemma-env/... と表示

# インストール
pip install langchain

# 複数バージョンが競合している場合
pip uninstall langchain -y
pip install langchain==0.0.350
```

---

#### ❌ `ConnectionRefusedError: [Errno 61] Connection refused`
**原因**: Ollamaサーバーに接続できない

**解決方法**:
```bash
# 1. サーバーが起動しているか確認
ps aux | grep ollama

# 2. ポート11434が使われているか確認
lsof -i :11434

# 3. サーバーを再起動
killall ollama
ollama serve  # フォアグラウンドで起動
```

---

#### ❌ `torch not installed` / CUDA関連エラー
**原因**: PyTorchがGPU対応でインストールされていない

**解決方法**:
```bash
# GPU対応版をインストール
pip uninstall torch -y

# NVIDIA GPU（CUDA）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# AMD GPU（ROCm）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm5.7

# CPU only
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Apple Silicon（M1/M2/M3）
pip install torch torchvision torchaudio
```

---

### 4️⃣ **音声認識エラー（Whisper）**

#### ❌ `Error running Whisper model`
**原因**: Whisperモデルがダウンロードされていない、またはメモリ不足

**解決方法**:
```bash
# 軽量モデル「tiny」から始める
python3 << 'EOF'
import whisper
model = whisper.load_model("tiny")
result = whisper.transcribe("audio.mp3")
print(result["text"])
EOF

# より高精度が必要な場合
# "tiny" → "base" → "small" → "medium" → "large"
# サイズが大きいほど精度が上がるが、メモリも増加
```

---

#### ❌ `No audio input detected`
**原因**: マイクが接続されていない、または認識されていない

**解決方法**:
```bash
# macOS: システム設定 → サウンド → 入力デバイスを確認
# Windows: 設定 → サウンド → 入力デバイスを確認

# Linux: 音声テスト
arecord -l  # マイクを列挙

# Python テスト
python3 << 'EOF'
import speech_recognition as sr
recognizer = sr.Recognizer()
with sr.Microphone() as source:
    print("Listening...")
    audio = recognizer.listen(source)
    print(f"Audio captured: {len(audio.frame_data)} bytes")
EOF
```

---

### 5️⃣ **ビジネス実装時のエラー**

#### ❌ `JSON parse error` / JSONパースエラー
**原因**: Gemmaの出力が予期したJSON形式ではない

**解決方法**:
```python
# エラーハンドリングを追加
import json
from langchain.llms import Ollama

llm = Ollama(model='gemma4')

def safe_json_parse(response_text):
    try:
        # 最初のJSONブロックを抽出
        start = response_text.find('{')
        end = response_text.rfind('}') + 1
        
        if start >= 0 and end > start:
            json_str = response_text[start:end]
            return json.loads(json_str)
    except json.JSONDecodeError:
        # フォールバック：構造化されたテキストで返す
        return {"error": "JSON parse failed", "raw_response": response_text}

response = llm("返してください：{'name': 'test'}")
data = safe_json_parse(response)
```

---

#### ❌ `Rate limiting` / API制限エラー
**原因**: 短時間に大量の推論リクエストを送信

**解決方法**:
```python
import time
from langchain.llms import Ollama

llm = Ollama(model='gemma4')

# レート制限を実装
def batch_process_with_throttle(items, delay=1):
    results = []
    for item in items:
        response = llm(item)
        results.append(response)
        time.sleep(delay)  # 1秒待機
    return results

# 使用
items = ["質問1", "質問2", "質問3"]
results = batch_process_with_throttle(items, delay=0.5)
```

---

#### ❌ `File permission denied` / ファイル権限エラー
**原因**: 出力ファイルが保存できない

**解決方法**:
```bash
# macOS/Linux
chmod 755 output_directory/
chmod 644 output_file.txt

# ディレクトリを作成して権限を設定
mkdir -p output/
chmod 777 output/

# Python で事前に確認
import os
output_dir = "output/"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)
    os.chmod(output_dir, 0o755)
```

---

### 6️⃣ **Raspberry Pi 固有エラー**

#### ❌ `Illegal instruction` / 非合法命令エラー
**原因**: Pi 上で最適化されていないバイナリが実行されている

**解決方法**:
```bash
# ARMv6 互換版をインストール
pip install --upgrade pip
pip install ollama --no-binary :all:

# または軽量モデルのみ使用
ollama pull neural-chat:7b
```

---

#### ❌ `SWAP memory full` / スワップメモリ不足
**原因**: メモリが完全に満杯になった

**解決方法**:
```bash
# スワップサイズを増加（Pi 設定）
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=2048 に変更（デフォルト100MB）

# 反映
sudo /etc/init.d/dphys-swapfile restart

# または軽量モデルのみ実行
ollama pull orca-mini:3b
```

---

## 🎯 **よくある質問（FAQ）**

### Q1: 複数のユーザーが同時にアクセスできる？
**A**: Ollamaサーバーはマルチユーザー対応。ただし推論は1件ずつ処理されるため、複数リクエストは待機キューに入ります。

```python
# 非同期処理で高速化
import asyncio
from langchain.llms import Ollama

async def process_parallel(queries):
    tasks = [llm(q) for q in queries]
    return await asyncio.gather(*tasks)
```

---

### Q2: 生成されたテキストがおかしい場合？
**A**: プロンプト設計を改善してください。

```python
# ❌ 悪い例
llm("日報を作成して")

# ✅ 良い例
llm("""
以下の形式で日報を作成してください：
- 日付：
- 天気：
- 作業内容：
- 明日の予定：

本文：
""")
```

---

### Q3: セキュリティはどうなっている？
**A**: Ollamaはローカル実行のため、データはPC内に留まります。ネットワークを介さない限り外部へ流出しません。

```python
# 設定例：ローカルホストのみアクセス
# ~/.ollama/ollama のポートを127.0.0.1に制限
export OLLAMA_HOST=127.0.0.1:11434
```

---

## 🚨 **最後の手段：リセット**

どうしてもうまくいかない場合：

```bash
# 1. Ollamaを完全に削除
brew uninstall ollama  # macOS
# または Windows/Linux は同様にアンインストール

# 2. キャッシュをクリア
rm -rf ~/.ollama/

# 3. 再インストール
brew install ollama  # macOS など

# 4. Gemma 4を新規ダウンロード
ollama pull gemma4
```