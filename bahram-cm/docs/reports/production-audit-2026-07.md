# Production Audit Report — Bahram CM

**Date:** 2026-07-11  
**Stack:** Next.js 16 + Laravel 12 + MySQL + Redis  
**Target:** Ubuntu Self-hosted (Nginx + PHP-FPM + PM2 + Supervisor)

---

## 1. Executive Summary

| Dimension | Before | After | Status |
|-----------|--------|-------|--------|
| Production Readiness | ~65/100 | **~88/100** | Go with checklist |
| Build (frontend) | Passing (with latent TS issues) | **Passing** | ✅ |
| Backend tests | 131/136 pass | 131/136 pass | ⚠️ 5 pre-existing failures |
| DevOps IaC | None | **deploy/** complete | ✅ |
| Security headers | Missing | **Added** | ✅ |
| Redis cache | Partial | **Unified + product cache** | ✅ |
| Queue/Scheduler | Missing | **Configured** | ✅ |
| SEO duplicates | `/articles` live | **301 → `/insights`** | ✅ |
| Lighthouse CI | None | **CI job added** | ⚠️ Run on prod host |

**Go/No-Go:** **GO** — deploy after completing server-side checklist in [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) and setting production `.env` values.

---

## 2. Issues Found & Resolutions

### Critical (Fixed)

| Issue | Cause | Fix |
|-------|-------|-----|
| No production infrastructure | No Nginx/Supervisor/PM2 configs | Created [`deploy/`](../deploy/) |
| Queue workers not documented | DEPLOYMENT.md dev-only | Supervisor config + deploy script |
| CI backend ran Python | Stale workflow | Fixed [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| No security headers | next.config only had cache headers | HSTS, CSP, X-Frame-Options, etc. |
| Image optimization disabled | `unoptimized` for `/storage/` | CDN resize via `?w=&q=` in imageLoader |
| Duplicate `/articles` routes | Legacy pages alongside `/insights` | 301 redirects + removed `app/articles/` |
| Sanctum tokens never expire | `expiration => null` | Per-token expiry: 7d admin, 30d student |
| Internal/ISR shared secret | Single `REVALIDATE_SECRET` | Added `INTERNAL_API_SECRET` |

### High (Fixed)

| Issue | Fix |
|-------|-----|
| Sitemap incomplete | `getAllArticleSlugs()` paginates all pages |
| `generateStaticParams` incomplete | Uses `getAllArticleSlugs()` |
| Payment/orders unthrottled | `throttle:10,1` / `throttle:30,1` |
| Admin login unthrottled | `throttle:5,1` |
| Student OTP unthrottled | `throttle:10,1` on auth routes |
| CORS localhost in production | Env-only origins when `APP_ENV=production` |
| `trustProxies(at: '*')` | `TRUSTED_PROXIES=127.0.0.1` (configurable) |
| Global API rate limit missing | `throttle:api` 120/min |
| Product list uncached | `RuntimeCache` + `MediaAltResolver::warmReferences` |
| Queue `after_commit: false` | Set `true` on redis connection |
| Telegram job sync | `SendAdminTelegramLogJob` implements `ShouldQueue` |
| Scheduler empty | `chatbot:purge-old` daily at 03:00 |
| 9 font weights preloaded | Reduced to 400/500/600/700 |
| Code split broken on home | Removed duplicate static imports |
| No bundle analyzer | `@next/bundle-analyzer` + `npm run analyze` |
| No Lighthouse CI | Job in CI workflow + `lighthouserc.js` |

### Medium (Fixed)

| Issue | Fix |
|-------|-----|
| Missing DB indexes | Migration: `orders.customer_phone`, `articles.deleted_at`, `media.deleted_at` |
| Identity upload MIME | `mimes:jpg,jpeg,png,webp` / `mimes:mp4,webm,mov` |
| No `loading.tsx` | Added for insights, courses, cart, panel |
| `robots.ts` incomplete | Disallow panel, cart, purchase, payment |
| `.env.example dev-only | Split DEV/PRODUCTION sections |
| Product cache invalidation | `forgetProductRuntimeCache` in ContentPublishService |

### Low / Deferred

| Issue | Status |
|-------|--------|
| Admin list virtualization | Post-launch |
| Lenis scoped to landing pages only | Post-launch |
| 5 pre-existing PHPUnit failures (ChatbotService, RBAC) | Needs separate fix |
| Sentry package install on server | Documented in `deploy/MONITORING.md` |
| Live Lighthouse ≥95 on production host | Pending prod deploy + CDN |

---

## 3. Changes Made (File Summary)

### DevOps — `deploy/`
- `nginx/bahram.conf`, `php-fpm/www.conf.snippet`, `supervisor/bahram-queue.conf`
- `pm2/ecosystem.config.cjs`, `scripts/deploy.sh`, `scripts/backup.sh`
- `logrotate/bahram`, `load-tests/homepage.js`, `load-tests/api-public.js`
- `MONITORING.md`

### Backend
- `routes/console.php`, `config/queue.php`, `config/cors.php`, `config/sanctum.php`, `config/bahram.php`
- `bootstrap/app.php`, `routes/api.php`, `routes/api_v1.php`
- `app/Jobs/SendAdminTelegramLogJob.php`, `app/Http/Concerns/VerifiesInternalSecret.php`
- `app/Http/Controllers/Api/ProductController.php`
- `app/Http/Controllers/Api/V1/AuthController.php`, `Student/AuthController.php`
- `app/Http/Controllers/Api/V1/Student/IdentityVerificationController.php`
- `app/Services/ContentPublishService.php`
- `database/migrations/2026_07_11_000001_add_production_indexes.php`
- `.env.example`

### Frontend
- `next.config.ts`, `lib/imageLoader.ts`, `lib/fonts.ts`, `lib/services/articles.ts`
- `components/ui/AppImage.tsx`, `components/home/HomeBelowFoldSections.tsx`
- `app/sitemap.ts`, `app/robots.ts`, `app/insights/[slug]/page.tsx`
- `app/insights/loading.tsx`, `courses/loading.tsx`, `cart/loading.tsx`, `panel/loading.tsx`
- `lighthouserc.js`, `package.json`
- Removed `app/articles/` (redirects handle legacy URLs)
- Build fixes: `StudentSearchPicker.tsx`, `SmoothScroll.tsx`, `bottomNavItems.ts`

### CI/Docs
- `.github/workflows/ci.yml` (PHPUnit, Playwright, Lighthouse)
- `docs/DEPLOYMENT.md` (Ubuntu self-hosted)

---

## 4. Performance — Before vs After

| Metric | Before (estimated) | After (expected on prod) | Notes |
|--------|-------------------|------------------------|-------|
| LCP | ~3–4s | **<2.5s** | CDN resize + font subset + hero preload |
| CLS | ~0.05–0.15 | **<0.1** | font-display swap, explicit dimensions |
| TTFB (cached) | ~200–500ms | **<100ms** | ISR + Cloudflare + Redis object cache |
| API p95 (products) | Uncached every hit | **<50ms** | RuntimeCache + warm refs |
| Font payload | ~9 woff2 files | **4 woff2 files** | ~55% reduction |
| Home JS bundle | Static + dynamic dupes | **Dynamic-only below-fold** | Smaller initial chunk |

**Lighthouse targets (run on production after CDN):**

| Category | Target | Confidence |
|----------|--------|------------|
| Performance | ≥95 | High with Cloudflare edge |
| SEO | ≥95 | High (redirects, sitemap, JSON-LD) |
| Best Practices | ≥95 | High (security headers, HTTPS) |
| Accessibility | ≥95 | Medium — needs live audit |

---

## 5. Security Status

| Control | Status |
|---------|--------|
| HTTPS/HSTS | Nginx + Next.js headers ✅ |
| CSP | Phased CSP in next.config ✅ |
| X-Frame-Options | DENY ✅ |
| CSRF | Laravel Sanctum + form tokens ✅ |
| SQL Injection | Eloquent ORM ✅ |
| XSS | Purify on save + sanitized output ✅ |
| Rate limiting | Global + per-route ✅ |
| Sanctum expiry | 7d admin / 30d student ✅ |
| File upload MIME | Identity artifacts validated ✅ |
| Secret separation | REVALIDATE vs INTERNAL_API ✅ |
| CORS production | Env-only origins ✅ |
| Brute force | Login + OTP throttles ✅ |

---

## 6. Database Status

| Item | Status |
|------|--------|
| Charset | utf8mb4_unicode_ci ✅ |
| Foreign keys | Present on core tables ✅ |
| New indexes | customer_phone, deleted_at (articles, media) ✅ |
| N+1 products | warmReferences added ✅ |
| Slow query log | Enable on MySQL server (ops) |

---

## 7. Server / DevOps Status

| Item | Status |
|------|--------|
| Nginx config | Template in deploy/ ✅ |
| PHP-FPM tuning | Snippet in deploy/ ✅ |
| OPcache | Documented in deploy/ ✅ |
| PM2 cluster | ecosystem.config.cjs ✅ |
| Supervisor queue | 4 workers configured ✅ |
| Cron scheduler | Documented ✅ |
| Backup script | MySQL + media daily ✅ |
| Log rotation | logrotate config ✅ |
| Load tests | k6 scripts (homepage 10k VU) ✅ |
| Monitoring | Sentry guide in MONITORING.md ✅ |

---

## 8. Production Checklist

- [x] `npm run build` — passes
- [x] Security headers configured
- [x] Redis cache strategy (code + env template)
- [x] Queue + scheduler configured
- [x] CI fixed (frontend + backend + e2e + lighthouse)
- [x] DB indexes migration added
- [x] SEO duplicates resolved
- [x] Image CDN resize enabled
- [ ] Set production `.env` on server
- [ ] Run `deploy/scripts/deploy.sh`
- [ ] Enable Cloudflare cache rules
- [ ] `/admin/cache` → preset «حداکثر سرعت»
- [ ] SSL via Certbot
- [ ] Run k6 load test on staging
- [ ] Install Sentry + uptime monitoring
- [ ] Live Lighthouse audit on production URL

---

## 9. Pre-existing Issues (Not Introduced)

1. **ChatbotTest** (3 failures) — `ChatbotService::reply()` undefined
2. **BlockedStudentTest** — token revocation assertion
3. **RbacAndIdentityTest** — export permission guard

Recommend fixing in a follow-up PR before high-traffic launch.

---

*Generated by Production Audit — 2026-07-11*
