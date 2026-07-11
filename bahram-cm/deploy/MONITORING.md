# Monitoring Setup — Bahram CM

## Error Tracking (Sentry)

### Backend (Laravel)

```bash
composer require sentry/sentry-laravel
```

In production `.env`:

```env
SENTRY_LARAVEL_DSN=https://<key>@sentry.io/<project>
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Publish config: `php artisan sentry:publish --dsn=<dsn>`

### Frontend (Next.js)

```bash
cd frontend && npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

In production `.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://<key>@sentry.io/<project>
SENTRY_AUTH_TOKEN=<token>
```

## Uptime Monitoring

Monitor these endpoints (Uptime Kuma / Better Stack / Pingdom):

| Endpoint | Expected |
|----------|----------|
| `GET https://www.example.com/` | 200 |
| `GET https://api.example.com/up` | 200 |
| `GET https://www.example.com/sitemap.xml` | 200 |

## Queue / Failed Jobs Alert

Cron or monitoring script:

```bash
php artisan queue:monitor redis:default --max=100
# Alert if failed_jobs count > 0:
mysql -e "SELECT COUNT(*) FROM failed_jobs" bahram_backend
```

## Log Channels

Laravel daily logs: `backend/storage/logs/laravel.log`  
Domain logs: `payment.log`, `sms.log`, `ai.log`, `spotplayer.log`  
Nginx: `/var/log/nginx/access.log`, `error.log`  
PHP-FPM slow: `/var/log/php8.2-fpm-slow.log`

## Metrics to Watch Under Load

- CPU / RAM (htop, node_exporter)
- PHP-FPM active workers (`pm.status_path`)
- Redis memory (`redis-cli info memory`)
- MySQL connections (`SHOW STATUS LIKE 'Threads_connected'`)
- Nginx 5xx rate
- Cache hit rate (Redis `INFO stats` keyspace_hits/misses)
