# Architecture Report — Academy Web

## Frontend (`web/`)
- **Next.js 16 App Router**, TypeScript, Tailwind v4, RTL-first, dark/light.
- **Rendering:** Server Components by default; static generation for all content
  detail routes via `generateStaticParams`.
- **Content layer:**
  - `lib/content.ts` — typed, cached MDX loaders for insights, transformations,
    events, courses, resources, guides (single source of truth).
  - `components/mdx/*` — `next-mdx-remote/rsc` pipeline with `remark-gfm`,
    `rehype-slug`, `rehype-autolink-headings`, and a styled component map.
  - `lib/cms/*` — `ContentProvider` abstraction. `local` provider wraps the MDX
    loaders (default); `sanity` provider is a documented scaffold selected when
    `NEXT_PUBLIC_SANITY_PROJECT_ID` is set. Swap is centralized — no page edits.
- **SEO:** `lib/seo.ts` (`buildMetadata`), `lib/jsonld.ts`, `app/sitemap.ts`,
  `lib/og.tsx` + route-level `opengraph-image.tsx`.
- **Analytics:** `lib/analytics/*` typed event schema + dispatcher;
  `components/analytics/*` script loader + `TrackedCTA`/`TrackedLinkButton`.
- **Services:** `lib/services/*` (`api`, `leads`, `newsletter`, `companion`) —
  the only place that talks to the backend.

## Backend (`backend/`)
- **FastAPI** modular monolith. New `app/modules/leads/` (models, schemas,
  service, router) exposes public, rate-limited `POST /api/v1/leads/apply` and
  `/leads/newsletter`. Alembic migration `20260617_0008_leads` creates the
  `leads` and `newsletter_subscribers` tables.
- Rate limiting uses Redis and fails open if Redis is unavailable.

## Data flow (lead capture)
```
ApplyForm (client) → lib/services/leads.submitLead → POST /api/v1/leads/apply
  → leads.service (rate limit + persist) → 201 { id, status, created_at }
  → analytics: academy_apply_success
```

## Conventions / guards
- `scripts/validate-images.mjs` — case-sensitive image existence check.
- `scripts/check-imports.mjs` — case-sensitive local import resolution.
- `npm run verify` aggregates lint + typecheck + both guards.
- CI (`.github/workflows/ci.yml`) runs verify + tests + build (web) and compile
  + ruff (backend).

## Notable decisions
- Kept the existing homepage content stubs in `content/site.ts` (curated
  ordering) separate from the full MDX collections used by index/detail routes.
- OG images run on the Node.js runtime to read local fonts.
