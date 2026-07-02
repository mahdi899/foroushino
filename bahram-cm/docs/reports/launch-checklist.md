# Launch Checklist — Academy Web

## Pre-deploy (code)
- [x] `npm run verify` (lint + typecheck + validate:images + check-imports)
- [x] `npm test` (Vitest, 24 tests)
- [x] `npm run build` succeeds, all routes prerender
- [ ] `npx playwright install` + `npm run test:e2e` against a staging build

## Environment
- [ ] `NEXT_PUBLIC_SITE_URL` = production URL (canonicals/sitemap/OG)
- [ ] `NEXT_PUBLIC_API_BASE_URL` = backend URL (no trailing slash)
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (or `NEXT_PUBLIC_GA_MEASUREMENT_ID`)
- [ ] Backend `.env`: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `CORS_ORIGINS`
      includes the frontend origin
- [ ] `alembic upgrade head` applied (leads + newsletter tables)

## Smoke test (post-deploy)
- [ ] Submit Apply form → success state + row in `leads`
- [ ] Submit Newsletter → success state + row in `newsletter_subscribers`
- [ ] Rate limiting returns a friendly message under rapid repeat submits
- [ ] `/sitemap.xml` and `/robots.txt` resolve; sitemap lists dynamic routes
- [ ] `/opengraph-image` and a per-slug OG render Persian text correctly
- [ ] Companion: invalid token → error; valid token → read-only dashboard
- [ ] Analytics realtime shows CTA/newsletter/apply events
- [ ] Spot-check `/courses`, `/resources`, `/guides`, legal pages on mobile + RTL

## SEO
- [ ] Submit sitemap to Search Console
- [ ] Validate JSON-LD (Rich Results Test) for an article and a course
- [ ] Confirm canonicals are per-page (not all `/`)

## Observability & ops
- [ ] Error monitoring on backend lead endpoints
- [ ] Uptime check on `/` and the API health route
- [ ] Backup/retention policy for `leads` data (see data-request policy)
