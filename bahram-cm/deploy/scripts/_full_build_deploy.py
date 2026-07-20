"""Upload local changes + full production build on server (no git pull)."""
from __future__ import annotations

import time

from _deploy_common import ROOT, app_root, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

# All telegram / worker fixes (committed or not — ensure server has latest local copy)
UPLOAD_REL = [
    "worker/src/index.js",
    "worker/wrangler.toml",
    "backend/app/Modules/TelegramBot/Http/Controllers/WebhookController.php",
    "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php",
    "backend/app/Modules/TelegramBot/Handlers/CallbackQueryHandler.php",
    "backend/app/Modules/TelegramBot/Jobs/ProcessTelegramUpdateJob.php",
    "backend/app/Modules/TelegramBot/Services/TelegramOutboundMessenger.php",
    "backend/app/Modules/TelegramBot/Services/RegistrationFlowService.php",
    "backend/app/Modules/TelegramBot/Services/BotAdminPanelService.php",
    "backend/app/Modules/TelegramBot/Services/TelegramBotResetService.php",
    "backend/app/Modules/TelegramBot/Services/TelegramWebhookReconcileService.php",
    "backend/app/Modules/TelegramBot/Models/TelegramBot.php",
    "backend/app/Modules/TelegramBot/Http/Middleware/VerifyTelegramWebhookSecret.php",
    "backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php",
    "backend/app/Modules/TelegramBot/Clients/TelegramBotClientFactory.php",
    "backend/app/Services/TelegramInfrastructureService.php",
    "backend/app/Modules/TelegramBot/Console/TelegramCleanupCommand.php",
    "backend/app/Modules/TelegramBot/TelegramBotServiceProvider.php",
    "backend/config/telegram_bot.php",
    "backend/config/telegram.php",
    "backend/routes/console.php",
    "backend/routes/telegram.php",
    "deploy/scripts/deploy.sh",
]

uploads = []
for rel in UPLOAD_REL:
    local = ROOT / rel
    if local.is_file():
        uploads.append((local, rel))

c = connect(env, timeout=180)
print(f"Uploading {len(uploads)} files...")
upload_files(c, uploads, env)

build_script = f"""#!/bin/bash
set -euo pipefail
APP_ROOT="{APP}"
BE="{BE}"
LOG=/tmp/bahram-full-build.log
exec > >(tee "$LOG") 2>&1
echo "=== FULL BUILD $(date -Is) ==="

cd "$BE"
grep -q '^TELEGRAM_OUTBOUND_SYNC=' .env && sed -i 's/^TELEGRAM_OUTBOUND_SYNC=.*/TELEGRAM_OUTBOUND_SYNC=false/' .env || echo 'TELEGRAM_OUTBOUND_SYNC=false' >> .env
grep -q '^TELEGRAM_UPDATE_RETENTION_HOURS=' .env || echo 'TELEGRAM_UPDATE_RETENTION_HOURS=24' >> .env
grep -q '^TELEGRAM_HTTP_CONNECT_TIMEOUT=' .env && sed -i 's/^TELEGRAM_HTTP_CONNECT_TIMEOUT=.*/TELEGRAM_HTTP_CONNECT_TIMEOUT=15/' .env || echo 'TELEGRAM_HTTP_CONNECT_TIMEOUT=15' >> .env
grep -q '^TELEGRAM_HTTP_TIMEOUT=' .env && sed -i 's/^TELEGRAM_HTTP_TIMEOUT=.*/TELEGRAM_HTTP_TIMEOUT=30/' .env || echo 'TELEGRAM_HTTP_TIMEOUT=30' >> .env
grep -vF '{{key}}=' .env > /tmp/env.clean 2>/dev/null && mv /tmp/env.clean .env || true

echo '==> Backend'
cd "$BE"
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan storage:link 2>/dev/null || true
php artisan media:guard-directories
php artisan media:sync --import 2>/dev/null || true
php artisan media:sync --export 2>/dev/null || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo '==> Frontend'
cd "$APP_ROOT/frontend"
unset NODE_ENV
if ! npm ci; then npm install --no-audit --no-fund; fi
export NODE_ENV=production
npm run build

echo '==> PM2'
PM2_CONFIG="$APP_ROOT/deploy/pm2/ecosystem.config.cjs"
pm2 reload "$PM2_CONFIG" --update-env || pm2 start "$PM2_CONFIG"

echo '==> Worker wrangler'
cd "$APP_ROOT/worker"
npm install --silent 2>/dev/null || true
CF=$(grep -E '^CLOUDFLARE_API_TOKEN=' "$BE/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -n "$CF" ]; then
  export CLOUDFLARE_API_TOKEN="$CF"
  npx wrangler deploy 2>&1 | tail -15
else
  echo 'SKIP wrangler — no CLOUDFLARE_API_TOKEN'
fi

echo '==> Telegram webhook'
cd "$BE"
php artisan tinker --execute="
app(App\\\\Services\\\\TelegramInfrastructureService::class)->syncProductionBotSecret();
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$bot->refresh();
app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot)->setWebhook(
  app(App\\\\Services\\\\TelegramInfrastructureService::class)->buildWebhookUrl('production'),
  \\$bot->resolveWebhookSecret()
);
echo json_encode(app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot)->getWebhookInfo(), JSON_UNESCAPED_UNICODE);
" 2>&1

echo '==> Queues / Horizon'
php artisan queue:clear redis --queue=telegram-inbound --force 2>/dev/null || true
php artisan queue:clear redis --queue=telegram-replies --force 2>/dev/null || true
supervisorctl restart bahram-horizon bahram-queue:* bahram-family-queue:* bahram-scheduler 2>/dev/null || supervisorctl restart bahram-horizon

CRON_LINE="* * * * * cd $BE && php artisan schedule:run >> /dev/null 2>&1"
( crontab -u www-data -l 2>/dev/null | grep -v schedule:run || true; echo "$CRON_LINE" ) | crontab -u www-data -

php -r "if (function_exists('opcache_reset')) opcache_reset();" 2>/dev/null || true

echo '==> Health'
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK || echo LARAVEL_FAIL
curl -sf -o /dev/null -w "NEXT:%{{http_code}}\\n" http://127.0.0.1:3000/ || echo NEXT_FAIL
curl -sf -o /dev/null -w "SITE:%{{http_code}}\\n" -H "Host: rostami.app" http://127.0.0.1/ || echo SITE_FAIL

echo "=== BUILD DONE $(date -Is) ==="
"""

sftp = c.open_sftp()
with sftp.file("/tmp/bahram-full-build.sh", "w") as f:
    f.write(build_script)
sftp.chmod("/tmp/bahram-full-build.sh", 0o755)
sftp.close()

print("Starting full build on server (may take 10-15 min)...")
c.exec_command("rm -f /tmp/bahram-full-build.done; nohup bash /tmp/bahram-full-build.sh; echo $? > /tmp/bahram-full-build.done")

for i in range(120):
    time.sleep(15)
    _, out, _ = c.exec_command("test -f /tmp/bahram-full-build.done && cat /tmp/bahram-full-build.done || echo running", timeout=10)
    status = out.read().decode().strip()
    if status != "running":
        print(f"Build finished exit={status}")
        break
    if i % 4 == 0:
        _, tail, _ = c.exec_command("tail -3 /tmp/bahram-full-build.log 2>/dev/null", timeout=10)
        t = tail.read().decode("utf-8", "replace").strip()
        if t:
            print("...", t.split("\\n")[-1][:120])
else:
    print("Build still running — tail log:")
    _, tail, _ = c.exec_command("tail -40 /tmp/bahram-full-build.log", timeout=15)
    print(tail.read().decode("utf-8", "replace"))
    c.close()
    raise SystemExit(0)

_, log_out, _ = c.exec_command("tail -80 /tmp/bahram-full-build.log", timeout=30)
print(log_out.read().decode("utf-8", "replace"))
c.close()
