from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class GenerateResponseRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=20)
    character: str = Field(..., min_length=1, max_length=64)
    mood: str = Field(..., min_length=1, max_length=64)
    model_id: str = Field(..., min_length=1, max_length=128)
