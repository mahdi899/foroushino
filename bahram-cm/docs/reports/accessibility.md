# Accessibility Report — Academy Web

## Implemented (WCAG 2.1 AA-oriented)
- **Skip link** to `#main-content` in the root layout; every page exposes
  `id="main-content"`.
- **RTL + lang.** `<html lang="fa" dir="rtl">`; directional icons use `rtl-flip`.
- **Forms.** Apply and Newsletter inputs are labelled; errors use
  `aria-invalid` + `aria-describedby` and `role="alert"`. Companion token field
  is labelled, announces errors, and supports ⌘/Ctrl+Enter submit.
- **Interactive widgets.** Accordion uses `aria-expanded`/`aria-controls` and a
  labelled region; carousel controls have `aria-label`s.
- **Focus visibility.** Buttons/links use `focus-visible` rings.
- **Decorative imagery.** Background/cover images use empty `alt` + `aria-hidden`
  so they are skipped by assistive tech; meaningful images have descriptions.
- **Reduced motion.** Animations short-circuit when `prefers-reduced-motion`.
- **Color/contrast.** Bone/mist text on ink/charcoal surfaces; gold/emerald used
  for accents with sufficient size.

## To verify before launch
- Full keyboard pass on nav (mobile menu), carousels, and forms.
- Screen-reader pass (NVDA/VoiceOver) on home, a course detail, and the apply
  flow.
- Contrast audit of `text-mist` on the lightest surfaces (borderline at small
  sizes); bump to `text-bone-dim` where it fails 4.5:1.
- Confirm visible focus order matches DOM order in RTL.

## Backlog
- Add `aria-current="page"` to the active nav link.
- Announce form submission success via a polite live region (in addition to the
  visible status message).
- Provide captions/transcripts for any embedded event recordings.
