from pydantic import BaseModel
from typing import List


class HotelData(BaseModel):
    """楽天トラベルからスクレイピングした宿泊施設データ"""
    name: str
    price: str
    features: List[str]
    description: str
    features_list: List[str]
    image_urls: List[str]


class GenerationResponse(BaseModel):
    """AI生成結果"""
    blog_content: str
    sns_content: str
