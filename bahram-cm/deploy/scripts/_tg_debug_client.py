import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

php = r"""<?php
require '/var/www/bahram-cm/backend/vendor/autoload.php';
$app = require '/var/www/bahram-cm/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$infra = app(App\Services\TelegramInfrastructureService::class);
$factory = app(App\Modules\TelegramBot\Clients\TelegramBotClientFactory::class);
$bot = App\Modules\TelegramBot\Models\TelegramBot::query()->where('key', 'production')->first();
$client = $factory->forBot($bot);
$ref = new ReflectionClass($client);
$base = $ref->getProperty('baseUrl');
$base->setAccessible(true);
echo json_encode([
  'panelBaseUrl' => $infra->panelBaseUrl(),
  'usesWorkerBridge' => $infra->usesWorkerBridge(),
  'telegramApiBaseUrl' => $infra->telegramApiBaseUrl(),
  'client_baseUrl' => $base->getValue($client),
  'config_telegram_api' => config('telegram.api_base_url'),
  'config_telegram_bot_api' => config('telegram_bot.api_base_url'),
], JSON_UNESCAPED_SLASHES) . PHP_EOL;
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.open("/tmp/tg_debug.php", "w") as f:
    f.write(php)
sftp.close()
_, out, err = c.exec_command("php /tmp/tg_debug.php; rm -f /tmp/tg_debug.php", timeout=60)
print(out.read().decode("utf-8", "replace"))
print(err.read().decode("utf-8", "replace"))
c.close()
