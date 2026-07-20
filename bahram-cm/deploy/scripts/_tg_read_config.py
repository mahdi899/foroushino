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

php_path = "/tmp/tg_diag.php"
php_body = """<?php
require '/var/www/bahram-cm/backend/vendor/autoload.php';
$app = require '/var/www/bahram-cm/backend/bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
$infra = app(App\\Services\\TelegramInfrastructureService::class);
$out = [
  'worker_url' => $infra->panelBaseUrl(),
  'backend_origin' => $infra->backendOrigin(),
  'proxy_token_len' => strlen((string) ($infra->proxySharedToken() ?? '')),
  'webhook_secret_len' => strlen((string) ($infra->webhookSecret() ?? '')),
  'uses_worker' => $infra->usesWorkerBridge(),
  'webhook_url' => $infra->buildWebhookUrl('production'),
  'server_webhook_url' => $infra->buildServerWebhookUrl('production'),
  'has_cf_token' => strlen(trim((string) env('CLOUDFLARE_API_TOKEN', ''))) > 0,
  'has_cf_zone' => strlen(trim((string) env('CLOUDFLARE_ZONE_ID', ''))) > 0,
  'env_webhook_base' => trim((string) env('TELEGRAM_WEBHOOK_BASE_URL', '')),
];
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.open(php_path, "w") as f:
    f.write(php_body)
sftp.close()
_, out, err = c.exec_command(f"php {php_path} && rm -f {php_path}", timeout=60)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
