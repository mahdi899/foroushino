# Production Readiness Report — Academy Web

> Reflects the as-built state at the end of the transformation. Verified with
> `npm run verify` (lint + typecheck + image + import validation) and a clean
> `npm run build`.

## Scorecard (0–5 each)

| Dimension | Score | Notes |
| --- | --- | --- |
| Functionality (forms, companion, content) | 5 | Apply + newsletter wired to FastAPI `leads` module; companion hardened with idle/loading/error/empty states; 6 content collections live. |
| SEO | 5 | Per-page `buildMetadata` canonicals, full sitemap (static + dynamic), dynamic OG images, Article/Breadcrumb/Course JSON-LD. |
| Performance | 4 | Server Components by default, `next/image` with `sizes`/`priority`, reduced-motion respected. Field Lighthouse run pending on prod host. |
| Accessibility | 4 | Skip link, labelled forms, `aria-*` on interactive widgets, focus-visible rings, RTL. Full screen-reader pass pending. |
| Security (companion token, lead endpoints) | 4 | Public endpoints rate-limited (Redis, fail-open); no secrets in client; companion is read-only. Add CAPTCHA/abuse monitoring before high traffic. |
| Observability (analytics) | 5 | Provider-agnostic adapter (Plausible default, GA4 optional), typed event schema, funnel instrumentation across CTAs/forms/companion. |
| Testing | 4 | 24 Vitest unit tests (SEO, validation, content targets) + Playwright smoke suite. Component/integration depth can grow. |
| CI/CD + Docs | 5 | GitHub Actions (web + backend), `.env.example`, `docs/DEPLOYMENT.md`. |

**Production Readiness Score: 87 / 100**

(Weighted: functionality/SEO/analytics fully met; remaining points gated on
live-host Lighthouse, a deeper a11y audit, and anti-abuse hardening.)

## Go / No-go criteria

- [x] `npm run build` passes
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run validate:images` passes
- [x] `npm run check-imports` passes
- [x] `npm test` passes (24/24)
- [ ] Backend leads endpoints reachable from configured origin *(verify on deploy)*
- [ ] Env vars documented + set in deployment target *(documented; set per host)*
- [ ] Analytics provider configured (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`) *(set on deploy)*

## What changed in this transformation

- **Phase 1** — Real Apply + Newsletter forms → FastAPI `leads` module (models,
  schemas, service with Redis rate-limit, router, Alembic migration). Image
  validator + import-casing guard scripts.
- **Phase 2** — Full MDX pipeline (`next-mdx-remote/rsc` + remark/rehype),
  typed cached loaders, new `courses`/`resources`/`guides` collections, content
  authored to targets (15 insights, 10 transformations, 10 events, 10 resources,
  10 courses, 6 guides).
- **Phase 3** — Course landing pages, mini-courses wired to real courses,
  social-proof strip, existing rich Academy App section retained.
- **Phase 4** — `buildMetadata` canonicals on every route, full sitemap, dynamic
  OG image cards (Persian font), Article/Breadcrumb/Course JSON-LD, content-graph
  internal links.
- **Phases 7–9** — Hardened companion flow, real legal suite (privacy, terms,
  cookies, data-request), analytics adapter + funnel events.
- **Phases 10–12** — Vitest + Playwright, CI + env + deploy docs, Sanity-oriented
  content provider abstraction.
