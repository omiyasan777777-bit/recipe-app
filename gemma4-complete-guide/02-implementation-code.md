# 💻 業界別実装コード集

## 【実装①】建設業向け：音声日報自動生成AI

### 必要なライブラリ
```bash
pip install openai-whisper gradio langchain ollama
```

### コード例：construction_daily_report.py
```python
import whisper
from langchain.llms import Ollama
import json
from datetime import datetime

# 音声ファイルをテキスト化
def transcribe_audio(audio_file_path):
    """MP3/WAVをテキストに変換"""
    model = whisper.load_model("base")
    result = whisper.transcribe(audio_file_path)
    return result["text"]

# テキストを日報に変換
def generate_daily_report(transcribed_text):
    """テキストから構造化日報を生成"""
    llm = Ollama(model='gemma4')
    
    prompt = f"""
以下は建設現場の音声メモです。これから以下の形式で日報を作成してください。

音声メモ：
{transcribed_text}

出力形式（JSON）：
{{
  "date": "YYYY-MM-DD",
  "site_name": "現場名",
  "weather": "天候",
  "workers": "作業員数",
  "work_summary": "本日の作業内容（100字以内）",
  "completed_tasks": ["タスク1", "タスク2"],
  "tomorrow_plans": ["予定1", "予定2"],
  "safety_issues": "安全上の問題（なければなし）",
  "materials_needed": ["材料1", "材料2"]
}}
"""
    
    response = llm(prompt)
    return response

# 実行例
if __name__ == "__main__":
    audio_file = "meeting.mp3"
    
    # Step 1: 音声をテキスト化
    text = transcribe_audio(audio_file)
    print(f"✅ 音声認識完了\n{text[:100]}...")
    
    # Step 2: 日報を生成
    report = generate_daily_report(text)
    print(f"✅ 日報生成完了\n{report}")
```

### 使用方法
```bash
python3 construction_daily_report.py
```

---

## 【実装②】医療・歯科向け：診察メモ自動生成 + 患者FAQ

### コード例：medical_assistant.py
```python
from langchain.llms import Ollama
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
import json

class MedicalAssistant:
    def __init__(self):
        self.llm = Ollama(model='gemma4')
        # 患者情報は完全ローカル保管（外に出さない）
        self.patient_data = {}
        self.memory = ConversationBufferMemory()
    
    def generate_diagnosis_note(self, patient_info: dict, symptoms: str):
        """診察メモを自動生成（情報は一切外に出さない）"""
        
        prompt = f"""
患者情報（社内のみ）：
名前: {patient_info.get('name', '匿名')}
年齢: {patient_info.get('age', '不明')}
既往歴: {patient_info.get('history', 'なし')}

症状：{symptoms}

以下のフォーマットで診察メモを作成してください：
[診断メモ]
- 主訴：
- 診察所見：
- 診断：
- 処方/治療内容：
- 次回受診予定：
"""
        
        return self.llm(prompt)
    
    def generate_patient_friendly_explanation(self, diagnosis: str):
        """医学用語を患者向けに翻訳"""
        
        prompt = f"""
以下の医学診断を患者にわかりやすく説明してください。
難しい医学用語は避けて、日常言葉で説明してください。

医学診断：
{diagnosis}

患者向け説明：
"""
        
        return self.llm(prompt)
    
    def generate_faq_from_diagnosis(self, diagnosis: str):
        """診断から患者が聞きそうな質問と回答を自動生成"""
        
        prompt = f"""
以下の診断に基づいて、患者がよく聞く5つのFAQを作成してください。

診断：{diagnosis}

形式：
Q1: 質問内容？
A1: 回答

Q2: 質問内容？
A2: 回答

...
"""
        
        return self.llm(prompt)

# 使用例
if __name__ == "__main__":
    assistant = MedicalAssistant()
    
    patient = {
        'name': '田中太郎',
        'age': 45,
        'history': '高血圧'
    }
    
    # 診察メモを生成
    memo = assistant.generate_diagnosis_note(patient, "頭痛と首の凝りが3日続いている")
    print("📋 診察メモ：")
    print(memo)
    
    # 患者向け説明を生成
    explanation = assistant.generate_patient_friendly_explanation(memo)
    print("\n📝 患者向け説明：")
    print(explanation)
    
    # FAQを自動生成
    faq = assistant.generate_faq_from_diagnosis(memo)
    print("\n❓ よくあるご質問：")
    print(faq)
```

---

## 【実装③】完全ローカル議事録AI

### コード例：meeting_minutes_ai.py
```python
import whisper
from langchain.llms import Ollama
import json
from datetime import datetime

class MeetingMinutesAI:
    def __init__(self):
        self.whisper_model = whisper.load_model("base")
        self.llm = Ollama(model='gemma4')
    
    def transcribe_meeting(self, audio_file):
        """会議音声を文字起こし"""
        print(f"🎙️ 文字起こし中...")
        result = whisper.transcribe(audio_file)
        return result["text"]
    
    def extract_action_items(self, transcript):
        """TODOアクション項目を自動抽出"""
        
        prompt = f"""
以下の会議議事録から、実行可能なアクション項目を抽出してください。
各アクション項目に優先度と担当者を付けてください。

議事録：
{transcript}

出力形式：
■アクション項目
- [優先度:高/中/低] 内容 (担当者) / 期限：○月○日
- [優先度:中] 内容 (担当者) / 期限：○月○日
...
"""
        
        return self.llm(prompt)
    
    def summarize_meeting(self, transcript):
        """会議を3文で要約"""
        
        prompt = f"""
以下の会議議事録を3文以内で要約してください。

議事録：
{transcript}

要約：
"""
        
        return self.llm(prompt)
    
    def generate_minutes(self, audio_file, meeting_title):
        """完全な議事録を生成"""
        
        # Step 1: 音声から文字起こし
        transcript = self.transcribe_meeting(audio_file)
        
        # Step 2: 要約
        summary = self.summarize_meeting(transcript)
        
        # Step 3: アクション項目抽出
        actions = self.extract_action_items(transcript)
        
        # ローカルファイルに保存（外部に出さない）
        minutes = {
            "title": meeting_title,
            "date": datetime.now().isoformat(),
            "summary": summary,
            "actions": actions,
            "full_transcript": transcript
        }
        
        return minutes

# 使用例
if __name__ == "__main__":
    ai = MeetingMinutesAI()
    
    minutes = ai.generate_minutes(
        audio_file="meeting_recording.mp3",
        meeting_title="営業戦略会議 2024年4月"
    )
    
    # 結果をJSONで保存（社内PC内に）
    with open("minutes.json", "w", encoding="utf-8") as f:
        json.dump(minutes, f, ensure_ascii=False, indent=2)
    
    print("✅ 議事録を生成・保存しました")
    print(f"📌 要約：{minutes['summary']}")
    print(f"✓ アクション項目：{len(minutes['actions'])}個")
```

---

## 【実装④】AI翻訳メディアの自動投稿エンジン

### コード例：auto_translation_media.py
```python
import feedparser
from langchain.llms import Ollama
import json
import hashlib
from datetime import datetime

class TranslationMediaEngine:
    def __init__(self):
        self.llm = Ollama(model='gemma4')
        self.processed_urls = set()  # 既に翻訳した記事を追跡
    
    def fetch_foreign_articles(self, rss_feed_urls: list):
        """複数のRSSフィードから記事を取得"""
        articles = []
        
        for url in rss_feed_urls:
            print(f"📡 {url} から記事を取得中...")
            feed = feedparser.parse(url)
            
            for entry in feed.entries[:5]:  # 最新5件
                article = {
                    'title': entry.title,
                    'url': entry.link,
                    'summary': entry.summary if hasattr(entry, 'summary') else '',
                    'published': entry.published if hasattr(entry, 'published') else ''
                }
                articles.append(article)
        
        return articles
    
    def translate_to_japanese(self, text):
        """英語から日本語に翻訳"""
        
        prompt = f"""
以下の英文を自然な日本語に翻訳してください。
技術用語は日本語カタカナで統一してください。

英文：
{text}

日本語翻訳：
"""
        
        return self.llm(prompt)
    
    def generate_japanese_headline(self, english_title):
        """英語タイトルから魅力的な日本語見出しを生成"""
        
        prompt = f"""
以下の英語タイトルから、日本のSNS（Threads/X）でバズりそうな
日本語見出しを3パターン生成してください。

英語タイトル：{english_title}

提案（3パターン）：
1. 
2. 
3. 
"""
        
        return self.llm(prompt)
    
    def generate_article_body(self, title, summary):
        """要約から1,000字程度の日本語記事本文を生成"""
        
        prompt = f"""
以下の情報から、日本人読者向けに1,000字程度の
解説記事を作成してください。

タイトル：{title}
概要：{summary}

記事本文：
"""
        
        return self.llm(prompt)
    
    def create_social_media_snippet(self, article_title, article_body):
        """Threads/X用の抜粋を生成"""
        
        prompt = f"""
以下の記事から、Threads/Xで拡散しそうな150字程度の
抜粋を作成してください。絵文字も活用してください。

タイトル：{article_title}
記事：{article_body[:500]}

抜粋：
"""
        
        return self.llm(prompt)
    
    def process_articles(self, articles):
        """記事をバッチ処理して日本語記事に変換"""
        
        japanese_articles = []
        
        for article in articles:
            article_id = hashlib.md5(article['url'].encode()).hexdigest()
            
            # 既に処理済みならスキップ
            if article_id in self.processed_urls:
                continue
            
            print(f"🔄 変換中：{article['title']}")
            
            # Step 1: タイトル翻訳
            jp_title = self.generate_japanese_headline(article['title'])
            
            # Step 2: 本文生成
            jp_body = self.generate_article_body(jp_title, article['summary'])
            
            # Step 3: SNS用抜粋
            snippet = self.create_social_media_snippet(jp_title, jp_body)
            
            japanese_articles.append({
                'original_url': article['url'],
                'japanese_title': jp_title,
                'japanese_body': jp_body,
                'social_snippet': snippet,
                'published': datetime.now().isoformat()
            })
            
            self.processed_urls.add(article_id)
        
        return japanese_articles
    
    def save_to_note(self, articles):
        """Note APIに投稿（オプション）"""
        
        for article in articles:
            filename = f"articles/{article['japanese_title'][:20]}.md"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"# {article['japanese_title']}\n\n")
                f.write(article['japanese_body'])
                f.write(f"\n\n[オリジナル]({article['original_url']})")
        
        print(f"✅ {len(articles)}件の記事を保存しました")

# 使用例
if __name__ == "__main__":
    engine = TranslationMediaEngine()
    
    # 翻訳対象のRSSフィード
    rss_feeds = [
        "https://news.ycombinator.com/rss",  # Y Combinator
        "https://www.techcrunch.com/feed/",  # TechCrunch
    ]
    
    # 実行
    articles = engine.fetch_foreign_articles(rss_feeds)
    jp_articles = engine.process_articles(articles)
    engine.save_to_note(jp_articles)
```

---

## 【実装⑤】AIテンプレート販売：ChatGPT風チャットボット（ローカル版）

### コード例：local_chatbot_ui.py
```python
import gradio as gr
from langchain.llms import Ollama
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
import json

class LocalChatbotTemplate:
    def __init__(self, system_prompt=""):
        self.llm = Ollama(model='gemma4')
        self.memory = ConversationBufferMemory()
        self.system_prompt = system_prompt or "You are a helpful AI assistant."
        self.conversation_count = 0
    
    def chat(self, user_message):
        """会話ロジック"""
        
        full_prompt = f"""
{self.system_prompt}

ユーザー: {user_message}

アシスタント:
"""
        
        response = self.llm(full_prompt)
        self.conversation_count += 1
        
        return response

# Gradio UI
def create_gradio_interface():
    chatbot = LocalChatbotTemplate(
        system_prompt="You are a helpful AI assistant. Answer in Japanese when asked in Japanese."
    )
    
    def respond(message, chat_history):
        response = chatbot.chat(message)
        chat_history.append((message, response))
        return "", chat_history
    
    with gr.Blocks() as demo:
        gr.Markdown("# 🤖 ローカルChatGPT（API無料版）")
        gr.Markdown("このアシスタントはあなたのPC内で動作します。データは一切外に出ません。")
        
        chatbot_display = gr.Chatbot(label="会話")
        msg = gr.Textbox(
            label="メッセージ",
            placeholder="何か聞いてみてください...",
            lines=1
        )
        submit = gr.Button("送信")
        
        submit.click(respond, [msg, chatbot_display], [msg, chatbot_display])
        msg.submit(respond, [msg, chatbot_display], [msg, chatbot_display])
    
    return demo

# 実行
if __name__ == "__main__":
    interface = create_gradio_interface()
    interface.launch(share=True)
```

---

## 【実装⑥】Raspberry Pi AI端末：受付ロボット化

### コード例：reception_robot.py
```python
import os
from langchain.llms import Ollama
import pyttsx3  # テキスト音声変換
import speech_recognition as sr  # 音声認識

class ReceptionRobot:
    def __init__(self):
        self.llm = Ollama(model='gemma4')
        self.recognizer = sr.Recognizer()
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 120)  # 話す速度
    
    def listen_to_visitor(self):
        """訪問者の声を認識"""
        
        with sr.Microphone() as source:
            print("🎤 お話しください...")
            audio = self.recognizer.listen(source, timeout=10)
        
        try:
            text = self.recognizer.recognize_google(audio, language="ja-JP")
            return text
        except sr.UnknownAudioFrameError:
            return "申し訳ありませんが、よく聞き取れませんでした"
    
    def process_visitor_request(self, visitor_input):
        """訪問者のリクエストを処理"""
        
        prompt = f"""
あなたは会社の受付ロボットです。
訪問者の要件に応じて、簡潔で親切な応答をしてください。
社内のどこの部署に案内するか判断してください。

訪問者の発言: {visitor_input}

応答（30字以内）:
"""
        
        response = self.llm(prompt)
        return response
    
    def speak_response(self, response_text):
        """応答を音声で返す"""
        
        print(f"🤖 受付AI: {response_text}")
        self.engine.say(response_text)
        self.engine.runAndWait()
    
    def greeting(self):
        """初期グリーティング"""
        greeting = "いらっしゃいませ。本日のご用件をお話しください。"
        self.speak_response(greeting)
    
    def run(self):
        """受付ロボット起動"""
        
        self.greeting()
        
        while True:
            visitor_input = self.listen_to_visitor()
            
            if "終わり" in visitor_input or "ありがとう" in visitor_input:
                closing = "本日はご来訪ありがとうございました"
                self.speak_response(closing)
                break
            
            response = self.process_visitor_request(visitor_input)
            self.speak_response(response)

# 実行
if __name__ == "__main__":
    robot = ReceptionRobot()
    robot.run()
```

---

## テンプレート販売向け複数モデル設定

```python
templates = {
    "営業支援AI": {
        "system_prompt": "営業戦略と顧客対応についてアドバイスする営業支援AI",
        "price": 4980,
        "features": ["リード分析", "営業資料自動生成", "顧客対応シミュレーション"]
    },
    "マーケティングAI": {
        "system_prompt": "デジタルマーケティング戦略のアドバイスをする",
        "price": 4980,
        "features": ["SNS戦略立案", "コンテンツ案", "分析レポート自動化"]
    },
    "カスタマーサポートAI": {
        "system_prompt": "顧客サポート対応を支援するAI。常に丁寧で親切に",
        "price": 9980,
        "features": ["FAQ自動生成", "問い合わせ仕分け", "サポート品質管理"]
    },
}
```