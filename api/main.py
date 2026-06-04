from schemas import GenerateResponseRequest
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api_utils import generate_response, get_available_openrouter_llms
import os

app = FastAPI(title="Pretendo API")


def _allowed_origins() -> list[str]:
    raw_origins = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


allowed_origins = _allowed_origins()
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


@app.get("/api/health")
def health():
    return {"message": "OK"}


@app.get("/api/available-openrouter-llms")
def available_openrouter_llms():
    return get_available_openrouter_llms()


@app.post("/api/generate-response")
def generate_response_api(request: GenerateResponseRequest):
    return {"response": generate_response(request)}
