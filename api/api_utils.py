from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import HTTPException, status
from openai import OpenAI, OpenAIError
from openrouter import OpenRouter
from schemas import GenerateResponseRequest
import os
import json

UTILS_DIR = Path(__file__).resolve().parent.parent / "utils"
DEFAULT_FREE_MODEL = {
    "id": "openrouter/free",
    "name": "OpenRouter Free",
    "canonical_slug": "openrouter/free",
}
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_TIMEOUT_SECONDS = 30.0
OPENROUTER_MAX_RESPONSE_TOKENS = 500

with (UTILS_DIR / "character.json").open() as f:
    characters = json.load(f)
with (UTILS_DIR / "moods.json").open() as f:
    moods = json.load(f)

load_dotenv(Path(__file__).resolve().parent / ".env")


def _load_openrouter_api_key() -> str:
    raw_key = os.getenv("OPENROUTER_API_KEY", "")
    api_key = raw_key.strip().strip('"').strip("'").replace('"', "").replace("'", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is missing or empty")
    return api_key


@lru_cache
def _get_openrouter() -> OpenRouter:
    return OpenRouter(api_key=_load_openrouter_api_key())


@lru_cache
def _get_openrouter_client() -> OpenAI:
    return OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=_load_openrouter_api_key(),
        timeout=OPENROUTER_TIMEOUT_SECONDS,
    )


@lru_cache(maxsize=1)
def get_available_openrouter_llms():
    try:
        response = _get_openrouter().models.list()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM provider is not configured",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to fetch available LLM models",
        ) from exc

    free_models = [
        model
        for model in response.data
        if ((model.pricing.completion == "0" and model.pricing.prompt == "0"))
    ]
    models = [
        {
            "id": model.id,
            "name": model.name.split("(free)")[0],
            "canonical_slug": model.canonical_slug,
        }
        for model in free_models
        if model.id != "openrouter/free"
    ]
    return [DEFAULT_FREE_MODEL, *models]


def _ensure_free_model(model_id: str) -> None:
    if model_id == DEFAULT_FREE_MODEL["id"]:
        return

    allowed_model_ids = {model["id"] for model in get_available_openrouter_llms()}
    if model_id not in allowed_model_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="model_id must reference an available free OpenRouter model",
        )


def _find_by_id_or_name(items: list[dict], key: str) -> dict:
    for item in items:
        if item["id"] == key or item["name"] == key:
            return item
    raise ValueError(f"Unknown value: {key}")


def generate_response(request: GenerateResponseRequest):
    _ensure_free_model(request.model_id)
    try:
        character = _find_by_id_or_name(characters, request.character)
        mood = _find_by_id_or_name(moods, request.mood)["description"]
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    system_message = (
        f"Answer as a public-figure-inspired {character['name']} character and in a {mood} mood.\n"
        "Keep it short and concise. Stay playful, non-hateful, and non-defamatory."
    )

    try:
        response = _get_openrouter_client().chat.completions.create(
            model=request.model_id,
            max_tokens=OPENROUTER_MAX_RESPONSE_TOKENS,
            messages=[
                {"role": "system", "content": system_message},
                *[message.model_dump() for message in request.messages],
            ],
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM provider is not configured",
        ) from exc
    except OpenAIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM provider request failed",
        ) from exc

    return response.choices[0].message.content
