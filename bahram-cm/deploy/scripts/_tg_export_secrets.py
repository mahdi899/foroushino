import io
import json
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

php_body = r"""<?php
require '/var/www/bahram-cm/backend/vendor/autoload.php';
$app = require '/var/www/bahram-cm/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$infra = app(App\Services\TelegramInfrastructureService::class);
$cache = app(App\Services\SettingService::class)->group('cache') ?? [];
$out = [
  'proxy_token' => $infra->proxySharedToken(),
  'webhook_secret' => $infra->webhookSecret(),
  'worker_url' => $infra->panelBaseUrl(),
  'backend_origin' => $infra->backendOrigin(),
  'cf_from_cache' => [
    'has_token' => !empty($cache['cloudflare_api_token'] ?? $cache['has_cloudflare_api_token'] ?? null),
    'zone_id' => $cache['cloudflare_zone_id'] ?? null,
  ],
];
file_put_contents('/tmp/tg_secrets.json', json_encode($out));
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.open("/tmp/tg_export.php", "w") as f:
    f.write(php_body)
sftp.close()

# pull secrets file locally (do not print contents)
_, out, err = c.exec_command("php /tmp/tg_export.php", timeout=60)
out.read()
err.read()

sftp = c.open_sftp()
local_secrets = Path(__file__).resolve().parent / "_tg_secrets.local.json"
with sftp.open("/tmp/tg_secrets.json", "r") as rf:
    data = json.loads(rf.read().decode("utf-8"))
sftp.close()
local_secrets.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

# cleanup remote
c.exec_command("rm -f /tmp/tg_export.php /tmp/tg_secrets.json")
c.close()

print("exported secrets to", local_secrets.name)
print("worker_url", data.get("worker_url"))
print("backend_origin", data.get("backend_origin"))
print("token_lens", len(data.get("proxy_token") or ""), len(data.get("webhook_secret") or ""))
