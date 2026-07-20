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

cmds = r"""
echo '=== GIT STATUS ==='
cd /var/www/foroushino && git rev-parse --short HEAD && git status -sb | head -5

echo '=== SERVER FACTORY ==='
grep -n 'telegramApiBaseUrl\|resolveApiBaseUrl\|TelegramInfrastructureService' /var/www/bahram-cm/backend/app/Modules/TelegramBot/Clients/TelegramBotClientFactory.php | head -10

echo '=== SERVER INFRA SERVICE METHODS ==='
grep -n 'function telegramApiBaseUrl\|function usesWorkerBridge\|function registerProductionWebhook' /var/www/bahram-cm/backend/app/Services/TelegramInfrastructureService.php | head -10

echo '=== WORKER FILES ==='
ls -la /var/www/bahram-cm/worker/src/index.js /var/www/bahram-cm/worker/deploy.sample.js 2>&1
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, _ = c.exec_command(cmds, timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
