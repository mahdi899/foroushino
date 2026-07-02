# Conversion (CRO) Report — Academy Web

## Funnel model

| Stage | Events | Surfaces |
| --- | --- | --- |
| Awareness | `content_view`, `homepage_cta_click` | Home, blog, guides |
| Interest | `course_cta_click` | Course landing pages, mini-courses |
| Intent | `newsletter_signup`, `event_register_click` | Newsletter CTA, events |
| Action | `academy_apply_submit/success/error`, `companion_access` | Apply form, companion |

All events are typed in `lib/analytics/events.ts` and dispatched through the
provider-agnostic adapter (Plausible default, GA4 optional).

## Conversion mechanics implemented
- **Real Apply form** with inline validation, loading/success/error states, and
  submit/success/error tracking — no dead-end static form.
- **Real Newsletter** with graceful failure, success messaging, and signup
  tracking; CTA section now wired on the insights index.
- **Course landing pages** with outcomes, audience, curriculum, testimonials,
  pricing tiers, and FAQ — each CTA fires `course_cta_click` with course + tier
  + location for funnel attribution.
- **Social proof strip** (50k+ students, 10+ years, 3.8× growth, 4.9/5) placed
  near decision points on `/courses` and `/apply`.
- **Content graph** drives readers from insights → courses/guides → apply.

## Recommended experiments (post-launch, data-driven)
1. Hero CTA copy/placement A/B (primary vs. apply).
2. Pricing tier ordering and "highlighted" tier selection.
3. Newsletter incentive (lead magnet from `/resources`).
4. Apply form length vs. completion rate (progressive disclosure).
5. Exit-intent newsletter prompt on long-form insights.

## Instrumentation to add next
- Scroll-depth and CTA-impression events for funnel drop-off analysis.
