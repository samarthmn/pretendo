# api

A project created with FastAPI CLI.

## Quick Start

Copy the example environment file and set a real OpenRouter key:

```bash
cp env.example .env
```

### Start the development server

```bash
uv run fastapi dev
```

Visit http://localhost:8000

### Deploy to FastAPI Cloud

> FastAPI Cloud is currently in private beta. Join the waitlist at https://fastapicloud.com

```bash
uv run fastapi deploy
```

## Project Structure

- `main.py` - Your FastAPI application
- `pyproject.toml` - Project dependencies

## Security Notes

- Keep `.env` out of git. `env.example` contains placeholders only.
- Set `ALLOWED_ORIGINS` to the exact frontend origins that should call the API.
- `/api/generate-response` only accepts `user` and `assistant` chat roles from clients; the backend owns the `system` prompt.
- Generation is restricted to OpenRouter free models and caps request history, message size, provider timeout, and response tokens.
- Run the focused API security tests before publishing changes:

```bash
uv run python -m unittest discover -s tests
```

## Learn More

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [FastAPI Cloud](https://fastapicloud.com)
