# MySQL / Redis tuning — Bahram CM

Apply on the production VPS (shared Nginx + PHP + Node + MySQL + Redis):

```bash
sudo bash /var/www/bahram-cm/deploy/scripts/tune-mysql.sh --check   # diagnose only
sudo bash /var/www/bahram-cm/deploy/scripts/tune-mysql.sh          # apply
cd /var/www/bahram-cm/backend && php artisan migrate --force
```

What it does:

| Setting | Purpose |
|---------|---------|
| `innodb_buffer_pool_size` | Sized from host RAM so hot tables stay in memory |
| Slow query log (`long_query_time=1`) | Find remaining heavy queries |
| Redis `maxmemory` + `allkeys-lru` | Prevent Redis OOM; evict stale cache under load |
| Laravel `CACHE_STORE` / `QUEUE` / `SESSION` → redis | Keep request path off MySQL for sessions/cache |

Indexes for high traffic live in:

`backend/database/migrations/2026_07_28_210000_add_high_traffic_performance_indexes.php`

After a RAM upgrade, re-run `tune-mysql.sh` so the buffer pool grows with the machine.
