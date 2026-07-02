# Performance Report — Academy Web

## Architecture choices that protect performance
- **Server Components by default.** New routes (courses, resources, guides,
  legal) render on the server; only genuinely interactive pieces are client
  components (`ApplyForm`, `NewsletterForm`, `Accordion`, `BigTestimonial`,
  `TrackedCTA`/`TrackedLinkButton`, companion).
- **Static generation.** All content detail routes use `generateStaticParams`
  and prerender as static HTML (verified in build output). OG images are the
  only on-demand dynamic functions.
- **Cached content loaders.** `lib/content.ts` wraps every collection read in
  `react`'s `cache`, so a request reads each MDX folder once.
- **Images.** `next/image` everywhere with explicit `sizes`; hero/above-the-fold
  images use `priority`; decorative covers use `aria-hidden`/empty alt.
- **Motion.** Framer Motion animations honour `useReducedMotion`; transitions
  are transform/opacity based.

## Known costs / watch items
- Framer Motion ships client JS on pages that use it (home, testimonials,
  accordions). Acceptable for the design language; revisit if LCP regresses.
- OG image routes load TTF fonts at request time — cached via `react.cache`, but
  cold starts pay the read once.
- `next-mdx-remote/rsc` compiles MDX at build for static pages (no client cost).

## Recommended measurement (post-deploy)
- Run Lighthouse (mobile + desktop) on `/`, `/courses`, `/course/campaign-writing`,
  a course detail, and an insight detail. Target 95+ performance.
- Track Core Web Vitals (LCP, INP, CLS) in field data via the analytics provider.

## Recommended optimizations (if needed after measurement)
- Lazy-load `BigTestimonial` carousel below the fold.
- Preload the primary hero image per template.
- Audit font loading strategy (subset YekanBakh, `font-display: swap`).
