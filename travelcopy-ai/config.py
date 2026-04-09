"""
TravelCopy AI の設定ファイル
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Ollama 設定（ローカルAIモデル）
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# OpenAI 互換設定
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", None)
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", None)

# 生成設定
AI_TEMPERATURE = float(os.getenv("AI_TEMPERATURE", "0.7"))
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "2000"))

# Playwright 設定
HEADLESS_MODE = os.getenv("HEADLESS_MODE", "true").lower() == "true"
WAIT_UNTIL = os.getenv("WAIT_UNTIL", "networkidle")

# ページ遷移タイムアウト（ミリ秒）
PAGE_TIMEOUT = int(os.getenv("PAGE_TIMEOUT", "60000"))

# デバッグモード
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# 出力設定
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./output")

def get_ai_client():
    """AIクライアントの初期化（OpenAIまたはOllama）"""
    import openai

    base_url = OPENAI_BASE_URL or OLLAMA_BASE_URL
    api_key = OPENAI_API_KEY or OLLAMA_API_KEY

    return openai.AsyncOpenAI(
        base_url=base_url,
        api_key=api_key
    )
