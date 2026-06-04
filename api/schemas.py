from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "system"]
    content: str = Field(..., min_length=1)


class GenerateResponseRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    character: str
    mood: str
    model_id: str = Field(..., min_length=1)
