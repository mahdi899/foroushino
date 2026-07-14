# Production Report — «خانواده داداش بهرام» (Bahram's Family)

**Date:** 2026-07-14
**Stack:** Laravel 12 (backend module) + Next.js 16 (`/family`) + Flutter (manager app) + MySQL + Redis + FTP/CDN media
**Scope:** Full end-to-end implementation of the Family system — membership, publishing, media, reactions/comments, interactive actions, analytics/AI, guest Pulse, and a dedicated manager app for Bahram's team.

---

## 1. Executive Summary

| Dimension | Status |
|---|---|
| Backend domain (enums, migrations, models, services) | ✅ Complete |
| Membership & auto-assignment (capacity-aware, Redis-locked) | ✅ Complete |
| Publishing + feed (cursor pagination, audience targeting) | ✅ Complete |
| Media pipeline (FTP storage, CDN playback, chunked upload, thumbnails/waveforms) | ✅ Complete |
| Reactions, comments, moderation, stats read-model | ✅ Complete |
| Bahram replies (text/voice reply posts) | ✅ Complete |
| Interactive actions (commitment/confirmation/choice/scale/number) + follow-ups | ✅ Complete |
| Analytics & AI (media progress, behavior profile, family DNA, daily summary, audience suggestion) | ✅ Complete |
| Next.js `/family` frontend (guest preview, onboarding, feed, Pulse) | ✅ Complete |
| Flutter manager app (auth, publish, moderate, families, analytics) | ✅ Complete (untested — see §5) |
| Backend automated tests (Pest) | ✅ 16/16 Family tests, 183/186 full suite |
| Frontend automated tests (Vitest) | ✅ 18 new component tests, 36/36 passing |
| Flutter automated tests | ⚠️ Written, unverified (no Flutter SDK in this environment) |
| Production docs (`docs/FAMILY.md`, `.env.example`, supervisor conf) | ✅ Complete |
| Dependency audit (`league/flysystem-ftp`) | ✅ Fixed — was missing from lock file, now installed & locked (v3.31.0) |

**Go/No-Go: GO**, with two follow-ups before shipping the manager app to real devices: (1) run `flutter create .` once the Flutter SDK is available locally/CI to generate the remaining platform scaffolding and execute `flutter test`/`flutter build`, and (2) point `FAMILY_MEDIA_FTP_*` env vars at the real FTP host and CDN base URL in production `.env`.

---

## 2. What Was Built

### 2.1 Backend (Laravel) — `bahram-cm/backend/`

- **76 PHP files** under the Family domain: enums, controllers, resources, jobs, models, services, support classes, and a Family-scoped middleware (`EnsureUserCanManageFamily`).
- **5 migrations** covering: foundation tables (families/memberships/entry events), posts+blocks+targets, reactions+comments+stats, actions+options+responses, analytics+upload sessions.
- **Media architecture**: a dedicated `family_media_ftp` Flysystem disk (via `league/flysystem-ftp`) stores originals/derivatives off the main app server; playback URLs are generated straight to the CDN host (`FamilyMediaUrl`), so the Laravel app never proxies media bytes. Chunked upload sessions (`FamilyMediaUploadSession`) support resumable large-file uploads from the manager app. Background jobs handle thumbnailing, waveform generation, video/audio processing, FTP transfer, and cleanup of expired temporary media.
- **Publishing safety**: a post cannot be published while any of its media blocks are not yet `ready` (fixed during hardening — previously this returned a 500 instead of a clean 422).
- **Moderation**: comments carry AI risk/sentiment/topic signals (via `AIService`, non-critical/queued), moderation states (pending/approved/rejected with typed rejection reasons), importance flagging, and an opt-in "family pulse" surfacing sanitized comments publicly.
- **Interactive actions**: five action types (commitment, confirmation, single/multi-choice, scale, number) with idempotent response submission and an optional queued follow-up job + in-app notification.
- **Analytics/AI**: `FamilyIntelligenceService` wraps `AIService` for daily summaries, topic extraction, and audience suggestions; `FamilyStatsService`/scheduled jobs aggregate media progress, behavior profiles, and family DNA snapshots.
- **RBAC**: a new `family-manager` admin role (`AdminRoleName::FamilyManager`) plus a granular permission catalog (`FamilyPermissionCatalog`) gates every manager endpoint.

### 2.2 Frontend (Next.js) — `bahram-cm/frontend/`

- **36 TS/TSX files** implementing the `/family` experience: guest preview + onboarding flow, member feed with cursor pagination, reaction bar (optimistic, with rollback on error), comments sheet (submit/list, error states), media blocks (image/video/audio/text/article), interactive action cards for all 5 action types, and a public "Family Pulse" section on the homepage.
- Server Actions (`lib/family/api.ts`) mediate all authenticated calls to the Laravel API; SWR hooks (`useFamilyComments`) manage client-side data fetching/caching.

### 2.3 Manager App (Flutter) — `bahram-family-manager/`

- **22 Dart files**: API client (Dio-based, with Sanctum token handling and typed `ApiException` parsing of both Laravel validation errors and the custom API error envelope), secure token storage, auth flow (email/password → optional math CAPTCHA → OTP → session), and 8 screens (login, home, posts list, post editor, comments moderation, families list, family detail, analytics) covering the full manager workflow: publish text/voice/video/image posts with audience targeting (all/include/exclude families, with AI-suggested audiences), moderate comments (approve/reject with reason/mark important/toggle pulse/reply text-or-voice), browse families and their DNA metrics, and view analytics (join sources, entry events, daily trends).
- Chunked upload support mirrors the backend's resumable upload session API for large media files.

---

## 3. Testing

### 3.1 Backend (Pest)

```
Tests\Feature\Family\FamilyActionTest              4 passed
Tests\Feature\Family\FamilyJoinAndFeedTest          4 passed
Tests\Feature\Family\FamilyManagerPublishingTest    3 passed
Tests\Feature\Family\FamilyReactionAndCommentTest   5 passed
-----------------------------------------------------------
Family suite:  16/16 passed (65 assertions)
Full suite:    183/186 passed (570 assertions)
```

The 3 remaining failures are in `Tests\Feature\RbacAndIdentityTest` (role-creation status codes) and are **pre-existing, unrelated to Family** — confirmed via `git diff` that the only Family-related change to shared RBAC code was purely additive (adding the `FamilyManager` enum case; no existing case, label, or validation rule was touched).

### 3.2 Frontend (Vitest)

18 new component tests added this session across the three highest-traffic interactive components:

| File | Tests | Coverage |
|---|---|---|
| `tests/family-reaction-bar.test.tsx` | 5 | optimistic add/remove, rollback on API error, active-state rendering |
| `tests/family-comments-sheet.test.tsx` | 6 | loading/empty states, submission, error display, sheet open/close |
| `tests/family-action-card.test.tsx` | 7 | commitment/confirmation/number/single-choice/multi-choice/scale submission |

Full run: **36/36 tests passing** across 5 suites. One pre-existing, unrelated suite (`tests/content.test.ts`) fails to even load due to a `server-only` import not resolving under the Vitest/Vite environment — this predates the Family work and is not caused by it (that file never imports anything from `lib/family/*`).

Fixed along the way: a React key-collision warning in `CommentsSheet.tsx` (`AnimatePresence` siblings lacked `key` props).

### 3.3 Flutter

A pure-Dart unit test file (`test/models_test.dart`, no widget pumping required) was added covering model parsing (`FamilyPostModel`, `FamilyCommentModel`, `PaginatedResult`) and formatter utilities. **This could not be executed** — the Flutter SDK is not installed in this environment, so `flutter test`/`flutter create`/`flutter build` were never run. The test was hand-verified line-by-line against the corresponding model implementations for field-name and type correctness, but treat it as unverified until run once the SDK is available. This is the single biggest open risk in this delivery — see §5.

---

## 4. Issues Found & Fixed This Session

| Issue | Cause | Fix |
|---|---|---|
| **`league/flysystem-ftp` required but not installed** | `composer.json` declared the dependency but `composer.lock` never resolved it (only appeared as a *suggested* package of `laravel/framework`); `composer install` would have failed outright in any fresh environment/CI | Ran `composer update league/flysystem-ftp --with-all-dependencies`; now locked at v3.31.0 and verified importable (`League\Flysystem\Ftp\FtpAdapter` resolves) |
| React key-collision warning in `CommentsSheet` | Two `motion.div` siblings under `AnimatePresence` without `key` | Added `key="overlay"` / `key="sheet"` |
| Non-existent `flutter test` coverage | No Flutter SDK in the dev sandbox | Wrote SDK-independent model tests; documented the gap explicitly in the app README and here |

No N+1 issues were found in a spot-check of the hottest read paths: `FeedService::forMember`/`guestPreview` eager-load author, blocks, media, articles, actions+options, reply-to-comment (+author), and per-family stats in a single query set, then batch-fetch the current user's reactions with one `whereIn`. Comment/reaction/stats tables carry composite indexes matching their actual query patterns (`post_id+family_id+status+created_at`, `family_pulse_at`, etc.) as defined in the migrations.

---

## 5. Known Gaps / Follow-ups Before Full Production Sign-off

1. **Flutter SDK never ran locally.** Once available: `flutter pub get`, `flutter create .` (to regenerate iOS/any missing platform folders), `flutter test`, `flutter analyze`, and a real device/emulator smoke test of the login → publish → moderate flow.
2. **FTP/CDN env values are placeholders.** Set real `FAMILY_MEDIA_FTP_HOST/PORT/USERNAME/PASSWORD/ROOT` and `FAMILY_MEDIA_CDN_BASE_URL` in production `.env` (see `docs/FAMILY.md` §"FTP + CDN").
3. **Queue workers**: confirm the dedicated Family supervisor program (`deploy/supervisor/family-worker.conf` per `docs/FAMILY.md`) is deployed alongside the existing workers — AI analysis, thumbnailing, and follow-up jobs all run on the `family` queue.
4. **Pre-existing `RbacAndIdentityTest` failures** and the pre-existing `tests/content.test.ts` load failure are unrelated to Family and were left as-is; worth a separate cleanup pass.

---

## 6. File Inventory

| Area | Count |
|---|---|
| Backend Family PHP files (enums/controllers/models/services/jobs/resources) | 76 |
| Backend Family migrations | 5 |
| Frontend Family TS/TSX files | 36 |
| Flutter manager app Dart files | 22 |
| Backend Pest tests (Family) | 16 |
| Frontend Vitest tests (Family) | 18 |

See [`docs/FAMILY.md`](../FAMILY.md) for full architecture, API reference, queue topology, and deployment steps.
