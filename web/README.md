# Pretendo Web

## Getting Started

Start the FastAPI service from `../api` first:

```bash
uv run fastapi dev
```

Then start the Next.js app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

In development, Next.js proxies `/api/*` to `http://localhost:8000/api/*`.
Set `NEXT_PUBLIC_API_BASE_URL` only when the API runs somewhere else.

## Checks

```bash
pnpm test
pnpm lint
pnpm build
```
