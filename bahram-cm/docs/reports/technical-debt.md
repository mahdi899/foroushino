# Technical Debt Report — Academy Web

## Resolved in this transformation
- Dead Apply/Newsletter forms → real backend submissions with states.
- `split("\n")` body rendering → real MDX pipeline.
- Homepage-only canonicals → per-route canonicals.
- Import-casing landmines (`academyTeaser`, `academyAppScreenshowcase`) fixed +
  guarded by `check-imports`.
- Unused `NewsletterCTA` wired into the insights index.
- Thin legal pages → full privacy/terms/cookies/data-request suite.
- `content_view` analytics on all content detail pages; hero + nav CTA tracking.

## Remaining debt (prioritized)

### High
- **Anti-abuse on public endpoints.** Rate-limit exists but no CAPTCHA/bot
  defense; add before paid traffic.

### Medium
- **Two content sources.** `content/site.ts` (homepage stubs) duplicates a few
  insight/transformation entries that also exist as MDX. Intentional for curated
  ordering, but consider deriving stubs from the loaders to avoid drift.
- **Sanity provider is a scaffold.** GROQ queries documented; real client wiring
  + Portable Text → MDX/HTML mapping still to do.
- **OG cards are text-only.** No per-slug imagery yet.

### Low
- **`@types/node` peer mismatch** required `--legacy-peer-deps` for test tooling;
  align versions when convenient.
- **Playwright not in CI** (browsers not installed in the web job); run E2E in a
  dedicated job/nightly.
- **Mist text contrast** borderline on lightest surfaces at small sizes.

## Suggested cleanup cadence
- Each sprint: run `npm run verify` + `npm test` in CI (already enforced).
- Quarterly: dependency upgrade + Lighthouse + a11y screen-reader pass.
