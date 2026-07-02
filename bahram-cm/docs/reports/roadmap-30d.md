# 30-Day Roadmap — Academy Web

Focus: validate the new funnel with real data, close the launch-blocking gaps,
and harden public endpoints.

## Week 1 — Launch & instrument
- Deploy frontend + backend; complete the launch checklist.
- Configure Plausible; confirm all funnel events fire.
- Emit `content_view` on all detail pages (insights, courses, events,
  transformations, resources, guides).
- Run Lighthouse on key templates; log scores in `performance.md`.

## Week 2 — Hardening
- Add bot defense to `/leads/*` (honeypot + lightweight CAPTCHA).
- Backend: email notification/CRM forward on new lead.
- Screen-reader + keyboard a11y pass; fix contrast on `text-mist` edge cases.
- Add `FAQPage` JSON-LD to `/faq` and per-course FAQs.

## Week 3 — Conversion iteration
- Ship first A/B test (hero CTA copy/placement).
- Add a lead magnet from `/resources` to the newsletter CTA.
- Add CTA-impression + scroll-depth events for drop-off analysis.

## Week 4 — Content & polish
- Fill any thin MDX bodies for courses/resources to full production depth.
- Add per-slug OG background imagery.
- Wire E2E (Playwright) into a nightly CI job.

## Exit criteria
- Funnel dashboard live with real conversions.
- Lighthouse 95+ on home + a course detail.
- No high-severity items left in `technical-debt.md`.
