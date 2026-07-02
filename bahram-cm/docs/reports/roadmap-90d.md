# 90-Day Roadmap — Academy Web

Focus: scale content operations, complete the CMS migration, and compound the
conversion engine.

## Month 1 — Stabilize (see 30-day roadmap)
- Launch, instrument the full funnel, harden endpoints, first A/B test.

## Month 2 — Content operations & CMS
- Stand up Sanity: install `@sanity/client`, define schemas mirroring the MDX
  frontmatter, and implement the `sanityProvider` `fetch` calls using the GROQ
  queries already documented in `lib/cms/sanity.ts`.
- Migrate one collection (insights) end-to-end; validate parity, then migrate the
  rest. Pages need no changes (provider swap via env).
- Add a Portable Text → renderer mapping aligned with `mdx-components`.
- Editorial workflow: drafts, scheduled publish, preview.

## Month 3 — Growth & depth
- Conversion: ship 2–3 more experiments (pricing order, apply length, exit-intent
  newsletter); formalize a weekly experiment review.
- Performance: enforce a Lighthouse budget in CI; lazy-load below-the-fold motion.
- Accessibility: re-audit to WCAG AA, including captions/transcripts for event
  recordings.
- Internationalization: decide whether to expand the `/en` shell into a full
  locale (hreflang, translated metadata) based on demand.
- Personalization: returning-visitor CTA logic; recommend next course/guide from
  the content graph.

## Stretch
- Search across content (Meilisearch already in backend env) wired to the
  WebSite SearchAction.
- Member dashboard expansion beyond the read-only companion view.

## Success metrics (90 days)
- Apply-form completion rate trending up across experiments.
- Newsletter list growth from resource lead magnets.
- Content publishing throughput up via CMS (no engineering in the loop).
- Core Web Vitals "good" on field data for all key templates.
