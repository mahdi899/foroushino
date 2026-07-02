# Bahram CM — Marketing API

FastAPI service for the public website: academy applications and newsletter signups.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/leads/apply` | Apply form |
| POST | `/api/v1/leads/newsletter` | Newsletter signup |
| GET | `/healthz` | Health check |

## Development

Prerequisites: MySQL 8 and Redis on localhost.

```bash
cd backend
cp .env.example .env
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

OpenAPI: <http://localhost:8000/api/v1/docs>

Ensure `CORS_ORIGINS` includes your frontend origin (default `http://localhost:3000`).
