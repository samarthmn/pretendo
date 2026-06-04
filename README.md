# Pretendo

Pretendo is a full-stack AI chat app that turns a normal prompt into a reply with a chosen character, mood, and OpenRouter model. It is built as a monorepo: a polished Next.js client at `/` and a Python FastAPI service at `/api`, deployed together on Vercel Services.

This project is small on purpose, but it covers the parts that matter in a real product: API boundaries, model validation, local persistence, deployment, environment config, tests, and a UI that feels finished.

## What It Shows

- Built and deployed a multi-service monorepo with Next.js and FastAPI on Vercel's experimental Services setup.
- Integrated OpenRouter with validated free-model selection and returned the exact model used for every reply.
- Added local-first chat history with browser SQLite through `sql.js`.
- Shipped a responsive chat UI with character, mood, and model controls.
- Hardened the API with CORS allowlists, backend-owned system prompts, request limits, provider timeouts, and focused tests.
- Kept the project production-minded with TypeScript checks, API tests, web tests, Vercel Analytics, and Speed Insights.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Phosphor Icons |
| Client storage | `sql.js` browser SQLite |
| Backend | FastAPI, Pydantic, Python 3.12 |
| AI | OpenRouter, OpenAI-compatible client |
| Deployment | Vercel experimental Services, Vercel Analytics, Speed Insights |
| Tooling | pnpm, uv, ESLint, `node:test`, Python `unittest` |

## Run Locally

```bash
cd api
uv run fastapi dev
```

```bash
cd web
pnpm dev
```

Open `http://localhost:3000`.

## Checks

```bash
cd api && uv run python -m unittest discover -s tests
cd web && pnpm test && pnpm exec tsc --noEmit && pnpm build
```
