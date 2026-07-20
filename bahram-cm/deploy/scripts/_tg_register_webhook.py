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

php_register = r"""<?php
require '/var/www/bahram-cm/backend/vendor/autoload.php';
$app = require '/var/www/bahram-cm/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$infra = app(App\Services\TelegramInfrastructureService::class);
$factory = app(App\Modules\TelegramBot\Clients\TelegramBotClientFactory::class);
$result = $infra->registerProductionWebhook($factory);
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
if (!($result['ok'] ?? false)) exit(1);
$bot = App\Modules\TelegramBot\Models\TelegramBot::query()->where('key', 'production')->first();
$info = $factory->forBot($bot)->getWebhookInfo();
echo json_encode(['webhook_info' => $info], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
try {
  $me = $factory->forBot($bot)->getMe();
  echo json_encode(['getMe' => ['id' => $me['id'] ?? null, 'username' => $me['username'] ?? null]], JSON_UNESCAPED_UNICODE) . PHP_EOL;
} catch (Throwable $e) {
  echo json_encode(['getMe_error' => $e->getMessage()], JSON_UNESCAPED_UNICODE) . PHP_EOL;
}
"""

cmds = r"""
cd /var/www/bahram-cm/backend
php artisan config:clear
php artisan cache:clear

echo '=== HORIZON / QUEUE ==='
supervisorctl status 2>/dev/null | grep -E 'horizon|telegram' || systemctl is-active supervisor 2>/dev/null

echo '=== REGISTER WEBHOOK ==='
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.open("/tmp/tg_register.php", "w") as f:
    f.write(php_register)
sftp.close()

_, out, err = c.exec_command(cmds + "php /tmp/tg_register.php; ec=$?; rm -f /tmp/tg_register.php; exit $ec", timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
