import sys
from pathlib import Path

from _deploy_common import ROOT, app_root, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

uploads = [
    (ROOT / "backend/app/Modules/TelegramBot/Clients/TelegramBotClientFactory.php", "backend/app/Modules/TelegramBot/Clients/TelegramBotClientFactory.php"),
    (ROOT / "backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php", "backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php"),
    (ROOT / "backend/app/Services/TelegramInfrastructureService.php", "backend/app/Services/TelegramInfrastructureService.php"),
    (ROOT / "worker/src/index.js", "worker/src/index.js"),
    (ROOT / "worker/deploy.sample.js", "worker/deploy.sample.js"),
    (ROOT / "worker/wrangler.toml", "worker/wrangler.toml"),
    (ROOT / "deploy/pm2/next-prod.cjs", "deploy/pm2/next-prod.cjs"),
]

php_register = f"""<?php
require '{BE}/vendor/autoload.php';
$app = require '{BE}/bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
App\\Services\\TelegramInfrastructureService::forgetCachedConfig();
$infra = app(App\\Services\\TelegramInfrastructureService::class);
$factory = app(App\\Modules\\TelegramBot\\Clients\\TelegramBotClientFactory::class);
$bot = App\\Modules\\TelegramBot\\Models\\TelegramBot::query()->where('key', 'production')->first();
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
if ($result['ok'] ?? false) {{
  $info = $factory->forBot($bot)->getWebhookInfo();
  $me = $factory->forBot($bot)->getMe();
  $post['webhook_info'] = [
    'url' => $info['url'] ?? null,
    'pending_update_count' => $info['pending_update_count'] ?? null,
  ];
  $post['getMe'] = ['username' => $me['username'] ?? null, 'id' => $me['id'] ?? null];
}}
echo json_encode(['pre' => $pre, 'post' => $post], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
if (!($result['ok'] ?? false)) exit(1);
"""

post_cmds = f"""
set -e
cd {BE}
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan optimize:clear
composer dump-autoload -o --no-interaction

# Ensure DB infra has backend_origin for worker sample/builders
php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
$settings = app(App\\Services\\SettingService::class);
$group = $settings->group("telegram");
$infra = is_array($group["infrastructure"] ?? null) ? $group["infrastructure"] : [];
$changed = false;
if (trim((string)($infra["backend_origin"] ?? "")) === "") {{
  $infra["backend_origin"] = "https://rostami.app";
  $changed = true;
}}
if (trim((string)($infra["base_url"] ?? "")) === "") {{
  $infra["base_url"] = trim((string) env("TELEGRAM_WEBHOOK_BASE_URL", "https://broken-mountain-6b4f.shokspy.workers.dev"));
  $changed = true;
}}
if ($changed) {{
  $settings->updateGroup("telegram", ["infrastructure" => $infra]);
  App\\Services\\TelegramInfrastructureService::forgetCachedConfig();
  echo "updated infrastructure settings\\n";
}} else {{
  echo "infrastructure settings ok\\n";
}}
'

supervisorctl restart bahram-horizon || true

echo '=== DEPLOY WORKER (wrangler) ==='
cd {APP}/worker
if ! command -v npm >/dev/null; then echo 'npm missing'; else
  npm install --no-audit --no-fund 2>&1 | tail -3
  PROXY=$(grep '^PROXY_SHARED_TOKEN=' {BE}/.env | cut -d= -f2-)
  WEBHOOK=$(grep '^TELEGRAM_WEBHOOK_SECRET=' {BE}/.env | cut -d= -f2-)
  export CLOUDFLARE_API_TOKEN=""
  # try settings cache for CF token
  CF=$(php -r 'require "{BE}/vendor/autoload.php"; $a=require "{BE}/bootstrap/app.php"; $a->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); $c=app(App\\Services\\SettingService::class)->group("cache"); echo $c["cloudflare_api_token"] ?? "";' 2>/dev/null || true)
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

c = connect(env, timeout=120)
upload_files(c, uploads, env)
sftp = c.open_sftp()
with sftp.open("/tmp/tg_register.php", "w") as f:
    f.write(php_register)
sftp.close()

_, out, err = c.exec_command(post_cmds, timeout=300)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
