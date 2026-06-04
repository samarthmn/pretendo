from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from openrouter import OpenRouter
from schemas import GenerateResponseRequest
import os
import json

UTILS_DIR = Path(__file__).resolve().parent.parent / "utils"

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


openRouterApiKey = _load_openrouter_api_key()

openRouter = OpenRouter(api_key=openRouterApiKey)

openRouterClient = OpenAI(
    base_url="https://openrouter.ai/api/v1", api_key=openRouterApiKey
)


def get_available_openrouter_llms():
    response = openRouter.models.list()
    free_models = [
        model
        for model in response.data
        if ((model.pricing.completion == "0" and model.pricing.prompt == "0"))
    ]
    return [
        {
            "id": model.id,
            "name": model.name.split("(free)")[0],
            "canonical_slug": model.canonical_slug,
        }
        for model in free_models
    ]


def _find_by_id_or_name(items: list[dict], key: str) -> dict:
    for item in items:
        if item["id"] == key or item["name"] == key:
            return item
    raise ValueError(f"Unknown value: {key}")


def generate_response(request: GenerateResponseRequest):
    character = _find_by_id_or_name(characters, request.character)
    mood = _find_by_id_or_name(moods, request.mood)["description"]
    system_message = (
        f"Answer the questions asked as {character['name']} character and in a {mood} mood.\n"
        "Do not answer too long, keep it short and concise. Try to stick the character's personality and tone."
    )
    print(system_message)
    response = openRouterClient.chat.completions.create(
        model=request.model_id,
        messages=[
            {"role": "system", "content": system_message},
            *[message.model_dump() for message in request.messages],
        ],
    )
    return response.choices[0].message.content
