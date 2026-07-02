# SEO Report — Academy Web

## Summary

SEO moved from "homepage canonical inherited everywhere" to a per-route system
with correct canonicals, structured data, dynamic social cards, and a complete
sitemap covering static + dynamic content.

## What was implemented

### Metadata & canonicals
- `buildMetadata({ title, description, path, type?, image?, noIndex? })` in
  `lib/seo.ts` produces correct `alternates.canonical`, OpenGraph, and Twitter
  cards per page (trailing slash normalised; root stays `/`).
- Applied to every route: home, course, courses, mini-courses, academy,
  academy/app, founder, transformations, events, faq, en, all legal pages, and
  all dynamic detail routes.
- `SITE.url` now respects `NEXT_PUBLIC_SITE_URL` so canonicals match the host.
- `/companion` is `noIndex` (transient, member-only).

### Structured data (JSON-LD)
- Site-wide: Person, Organization, Course, WebSite (with SearchAction).
- Per article (insights): `Article` + `BreadcrumbList`.
- Per course: `Course` with name/description/url.

### Sitemap
- `app/sitemap.ts` rebuilt as async: 19 static routes + dynamic insights,
  transformations, events, courses, resources, guides, with per-type priority
  and `lastModified` from content dates.

### Social cards (OG)
- Shared `lib/og.tsx` renders branded 1200×630 cards with the Persian YekanBakh
  font. Route handlers: home + per-slug for courses, insights, transformations,
  events.

### Internal linking / content graph
- Insight detail pages link out to `/courses` and `/guides`; related items in
  each collection; nav + footer expose courses/guides/resources.

## Verification
- `npm run build` shows `/sitemap.xml`, `/robots.txt`, and `*/opengraph-image`
  routes generated.
- Unit tests assert canonical correctness (`tests/seo.test.ts`).

## Recommended next steps
- Submit `sitemap.xml` to Search Console; monitor coverage.
- Add `FAQPage` JSON-LD to `/faq` and per-course FAQ blocks.
- Consider per-slug OG background imagery using the content cover photos.
- Add hreflang if the `/en` shell grows into a full locale.
