# Bahram Telegram Relay (Cloudflare Worker)

A minimal, single-purpose Cloudflare Worker that sits between Telegram and
Server 1 (`rostami.app`). It is **not** a general proxy — it only relays the
Telegram bot webhook, so Telegram's servers reach the edge (unaffected by
ISP-level filtering inside Iran) instead of hitting `rostami.app` directly.

```
Telegram ──POST──▶ Worker (workers.dev)
                     │  1. verify method + path shape
                     │  2. verify X-Telegram-Bot-Api-Secret-Token
                     │  3. drop duplicate update_id (best effort)
                     ▼
                   rostami.app  (Authorization: Bearer <PROXY_SHARED_TOKEN>
                                  X-Proxy-Origin: Cloudflare-Worker)
```

Laravel's `proxy.origin:strict` middleware (see
`backend/app/Http/Middleware/EnsureProxyOrigin.php`) then drops any request
to the webhook route that does **not** carry those two headers — so once
this Worker is the registered webhook, direct requests to `rostami.app`
bypassing it are rejected with 403 before the Telegram secret is even
inspected.

## Deploy

```bash
cd bahram-cm/worker
npm install
npx wrangler login          # once per machine
npx wrangler deploy         # production
npx wrangler deploy --env staging
```

## Secrets

Set with `wrangler secret put <NAME>` (never commit these — they are not in
`wrangler.toml`):

| Secret | Must match |
|---|---|
| `TELEGRAM_WEBHOOK_SECRET` | Backend's `TELEGRAM_WEBHOOK_SECRET` (or `TELEGRAM_STAGING_WEBHOOK_SECRET` for the staging bot) |
| `PROXY_SHARED_TOKEN` | Backend's `PROXY_SHARED_TOKEN` |

```bash
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put PROXY_SHARED_TOKEN
```

## Non-secret config (`wrangler.toml` `[vars]`)

| Var | Purpose | Default |
|---|---|---|
| `BACKEND_ORIGIN` | Where to forward the verified webhook | `https://rostami.app` |
| `WEBHOOK_PATH_PREFIX` | Path prefix the worker accepts | `/api/v1/integrations/telegram/` |
| `PROXY_ORIGIN_VALUE` | Value sent in `X-Proxy-Origin` | `Cloudflare-Worker` |
| `DEDUPE_TTL_SECONDS` | Edge dedupe TTL (if KV bound) | `120` |

## Optional edge de-duplication (KV)

Laravel already enforces the real idempotency guarantee (`update_id` is
unique per bot in `telegram_updates`), so this is purely a best-effort
optimization to avoid double-forwarding on Telegram retries:

```bash
npx wrangler kv namespace create TELEGRAM_DEDUPE
```

Uncomment the `[[kv_namespaces]]` block in `wrangler.toml`, fill in the
printed `id`, and redeploy. Without this binding the worker still works
correctly — it simply skips the edge-level dedupe check.

## Point Telegram at the Worker

After deploying, set `TELEGRAM_WEBHOOK_BASE_URL` in the backend `.env` to
the Worker's public URL (e.g. `https://bahram-telegram-relay.<you>.workers.dev`),
then re-register the webhook from the backend:

```bash
php artisan telegram:webhook:set production
php artisan telegram:webhook:set staging
```

Telegram will now call the Worker; the Worker forwards to `rostami.app`.

## Local development

```bash
npm run dev
```

`wrangler dev` runs the worker locally; set the same two secrets with
`wrangler secret put --local` or a `.dev.vars` file (git-ignored) for local
testing against a local backend (`BACKEND_ORIGIN=http://127.0.0.1:8010`,
overridable via `wrangler dev --var BACKEND_ORIGIN:http://127.0.0.1:8010`).
