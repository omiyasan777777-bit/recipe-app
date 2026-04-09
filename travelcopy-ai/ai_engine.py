"""
AI生成エンジン
Ollama（ローカルAIモデル）またはOpenAIを使用して記事を生成
"""
from config import get_ai_client, OLLAMA_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS
from models import HotelData


class AIEngine:
    """AIを使用した文章生成エンジン"""

    def __init__(self):
        """OllamaまたはOpenAIに接続"""
        self.client = get_ai_client()
        self.model = OLLAMA_MODEL
        self.temperature = AI_TEMPERATURE
        self.max_tokens = AI_MAX_TOKENS

    async def generate_all(self, hotel_data: HotelData) -> dict:
        """
        ブログ記事とSNS投稿の両方を生成

        Args:
            hotel_data: 宿泊施設データ

        Returns:
            {"blog": ブログ記事, "sns": SNS投稿} の辞書
        """
        print("✍️ AIライターが執筆を開始しました...")
        blog_text = await self._generate_text(hotel_data, "blog")
        sns_text = await self._generate_text(hotel_data, "sns")
        return {"blog": blog_text, "sns": sns_text}

    async def _generate_text(self, hotel_data: HotelData, mode: str) -> str:
        """
        モード別に文章を生成

        Args:
            hotel_data: 宿泊施設データ
            mode: "blog" または "sns"

        Returns:
            生成されたテキスト
        """
        system_prompt = """
あなたは月商100万円を稼ぐプロの旅行セールスライターです。
提供された宿のデータを元に、読者の「予約への渇望（Desire）」を最大化するコンテンツを生成してください。

# 思考プロセス
1. ターゲットの悩み（日常の疲れ、単調な毎日、ストレス）を特定せよ。
2. 宿のスペックを「解決策（ベネフィット）」へ変換せよ（例：露天風呂 → 思考がほどける時間）。
3. 五感（湯気の匂い、肌に触れる風の温度、水の音）を言葉にせよ。
4. 希少性や「今、予約すべき理由」を自然に混ぜ込め。

# 制約事項
- 薬機法・景表法を遵守し、断定的表現（「治る」「最高」）を避け、情緒的な表現（「心身が整う」「至福の」）を使え。
- 中学生でもイメージできる平易で魅力的な言葉を使え。
"""

        user_prompt = f"""
以下の宿の情報をもとに、{mode}用のコンテンツを作成してください。

宿名: {hotel_data.name}
価格: {hotel_data.price}
特徴: {", ".join(hotel_data.features)}
詳細: {hotel_data.description}
"""

        if mode == "sns":
            user_prompt += "\n※X(Twitter)用です。180文字以内で、好奇心を刺激し、リプライ欄への誘導を含めてください。"
        else:
            user_prompt += "\n※ブログ用です。導入、メリットTOP3、詳細レビュー、まとめの構成で、ストーリー仕立てにしてください。"

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ AI生成エラー: {e}")
            raise
