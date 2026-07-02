# Deployment Guide — Bahram CM

This guide covers deploying the Next.js frontend (project root) and the FastAPI
backend (`backend/`). CI runs lint, typecheck, image/import validation, unit
tests and a production build on every push and PR (see
`.github/workflows/ci.yml`).

## 1. Prerequisites

- Node.js 20+
- Python 3.11+
- A reachable backend API (FastAPI) with the `leads` tables migrated
- (Optional) Plausible domain or GA4 measurement ID for analytics
- (Optional) Sanity project for the CMS abstraction

## 2. Frontend (project root)

### Environment

Copy `.env.example` to `.env.local` (dev) or set the variables in your host:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | yes | Backend base URL (no trailing slash) |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Canonical site URL for SEO/sitemap/OG |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | no | Enables Plausible analytics |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` | no | Self-hosted Plausible script URL |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | no | Enables GA4 analytics |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | no | Switches content layer to Sanity |

### Build & run

```bash
npm ci
npm run verify   # lint + typecheck + validate:images + check-imports
npm run build
npm start        # serves the production build
```

### Recommended hosts

- **Vercel**: set the project root to this repository root, add the env vars, deploy.
- **Container**: `next build` then `next start` behind a reverse proxy.

## 3. Backend (`backend/`)

```bash
cd backend
cp .env.example .env   # fill DATABASE_URL, REDIS_URL, SECRET_KEY, CORS_ORIGINS
pip install -e .
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Ensure `CORS_ORIGINS` includes the deployed frontend origin so the Apply and
Newsletter forms can POST to `/api/v1/leads/*`.

## 4. Post-deploy checklist

See `docs/reports/launch-checklist.md` for the full pre-launch checklist.
Quick smoke test:

1. Submit the Apply form → expect success state + a row in `leads`.
2. Submit the newsletter → expect success state + a row in `newsletter_subscribers`.
3. Visit `/sitemap.xml` → confirm static + dynamic routes appear.
4. Visit `/courses`, `/resources`, `/guides` and a few detail pages.
5. Visit `/<route>/opengraph-image` renders Persian text correctly.
6. Confirm analytics events fire (Plausible/GA4 realtime) on CTA clicks.
