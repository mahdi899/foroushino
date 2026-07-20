import io
import json
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
DEPLOY_ENV = Path(__file__).resolve().parents[1] / "deploy.env"

env = {}
for line in DEPLOY_ENV.read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

uploads = [
    (ROOT / "backend/app/Modules/TelegramBot/Clients/TelegramBotClientFactory.php",
     "/var/www/foroushino/bahram-cm/backend/app/Modules/TelegramBot/Clients/TelegramBotClientFactory.php"),
    (ROOT / "backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php",
     "/var/www/foroushino/bahram-cm/backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php"),
    (ROOT / "backend/app/Services/TelegramInfrastructureService.php",
     "/var/www/foroushino/bahram-cm/backend/app/Services/TelegramInfrastructureService.php"),
    (ROOT / "worker/src/index.js",
     "/var/www/foroushino/bahram-cm/worker/src/index.js"),
    (ROOT / "worker/deploy.sample.js",
     "/var/www/foroushino/bahram-cm/worker/deploy.sample.js"),
    (ROOT / "worker/wrangler.toml",
     "/var/www/foroushino/bahram-cm/worker/wrangler.toml"),
    (ROOT / "deploy/pm2/next-prod.cjs",
     "/var/www/foroushino/bahram-cm/deploy/pm2/next-prod.cjs"),
]

php_register = r"""<?php
require '/var/www/bahram-cm/backend/vendor/autoload.php';
$app = require '/var/www/bahram-cm/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
App\Services\TelegramInfrastructureService::forgetCachedConfig();
$infra = app(App\Services\TelegramInfrastructureService::class);
$factory = app(App\Modules\TelegramBot\Clients\TelegramBotClientFactory::class);
$bot = App\Modules\TelegramBot\Models\TelegramBot::query()->where('key', 'production')->first();
$client = $factory->forBot($bot);
$ref = new ReflectionClass($client);
$base = $ref->getProperty('baseUrl');
$base->setAccessible(true);
$pre = [
  'uses_worker' => $infra->usesWorkerBridge(),
  'api_base' => $infra->telegramApiBaseUrl(),
  'client_base' => $base->getValue($client),
  'webhook_url' => $infra->buildWebhookUrl('production'),
];
$result = $infra->registerProductionWebhook($factory);
$post = ['register' => $result];
if ($result['ok'] ?? false) {
  $info = $factory->forBot($bot)->getWebhookInfo();
  $me = $factory->forBot($bot)->getMe();
  $post['webhook_info'] = [
    'url' => $info['url'] ?? null,
    'pending_update_count' => $info['pending_update_count'] ?? null,
  ];
  $post['getMe'] = ['username' => $me['username'] ?? null, 'id' => $me['id'] ?? null];
}
echo json_encode(['pre' => $pre, 'post' => $post], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
if (!($result['ok'] ?? false)) exit(1);
"""

post_cmds = r"""
set -e
cd /var/www/bahram-cm/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan optimize:clear
composer dump-autoload -o --no-interaction

# Ensure DB infra has backend_origin for worker sample/builders
php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$settings = app(App\Services\SettingService::class);
$group = $settings->group("telegram");
$infra = is_array($group["infrastructure"] ?? null) ? $group["infrastructure"] : [];
$changed = false;
if (trim((string)($infra["backend_origin"] ?? "")) === "") {
  $infra["backend_origin"] = "https://rostami.app";
  $changed = true;
}
if (trim((string)($infra["base_url"] ?? "")) === "") {
  $infra["base_url"] = trim((string) env("TELEGRAM_WEBHOOK_BASE_URL", "https://broken-mountain-6b4f.shokspy.workers.dev"));
  $changed = true;
}
if ($changed) {
  $settings->updateGroup("telegram", ["infrastructure" => $infra]);
  App\Services\TelegramInfrastructureService::forgetCachedConfig();
  echo "updated infrastructure settings\n";
} else {
  echo "infrastructure settings ok\n";
}
'

supervisorctl restart bahram-horizon || true

echo '=== DEPLOY WORKER (wrangler) ==='
cd /var/www/bahram-cm/worker
if ! command -v npm >/dev/null; then echo 'npm missing'; else
  npm install --no-audit --no-fund 2>&1 | tail -3
  PROXY=$(grep '^PROXY_SHARED_TOKEN=' /var/www/bahram-cm/backend/.env | cut -d= -f2-)
  WEBHOOK=$(grep '^TELEGRAM_WEBHOOK_SECRET=' /var/www/bahram-cm/backend/.env | cut -d= -f2-)
  export CLOUDFLARE_API_TOKEN=""
  # try settings cache for CF token
  CF=$(php -r 'require "/var/www/bahram-cm/backend/vendor/autoload.php"; $a=require "/var/www/bahram-cm/backend/bootstrap/app.php"; $a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); $c=app(App\Services\SettingService::class)->group("cache"); echo $c["cloudflare_api_token"] ?? "";' 2>/dev/null || true)
  if [ -n "$CF" ]; then export CLOUDFLARE_API_TOKEN="$CF"; fi
  if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    npx wrangler deploy 2>&1 | tail -20
    printf '%s' "$PROXY" | npx wrangler secret put PROXY_SHARED_TOKEN 2>&1 | tail -3
    printf '%s' "$WEBHOOK" | npx wrangler secret put TELEGRAM_WEBHOOK_SECRET 2>&1 | tail -3
  else
    echo 'skip wrangler deploy — no CLOUDFLARE_API_TOKEN (worker already live at broken-mountain)'
  fi
fi

php /tmp/tg_register.php; ec=$?
rm -f /tmp/tg_register.php
exit $ec
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

sftp = c.open_sftp()
for local, remote in uploads:
    sftp.put(str(local), remote)
    print(f"uploaded {local.name}")
with sftp.open("/tmp/tg_register.php", "w") as f:
    f.write(php_register)
sftp.close()

_, out, err = c.exec_command(post_cmds, timeout=300)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
