from schemas import GenerateResponseRequest
from fastapi import FastAPI
from api_utils import generate_response, get_available_openrouter_llms

app = FastAPI()


@app.get("/health")
def health():
    return {"message": "OK"}


@app.get("/api/available-openrouter-llms")
def available_openrouter_llms():
    return get_available_openrouter_llms()


@app.post("/api/generate-response")
def generate_response_api(request: GenerateResponseRequest):
    return generate_response(request)
