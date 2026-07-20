import io, sys
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"): k,v=line.split("=",1); env[k.strip()]=v.strip()
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
cmds = """
grep -n 'proxyBearerToken\|authorizedRequest\|withToken' /var/www/bahram-cm/backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php | head -10
grep -n 'function telegramApiBaseUrl\|function webhookBaseUrl\|function proxySharedToken' /var/www/bahram-cm/backend/app/Services/TelegramInfrastructureService.php | head -10
"""
_, out, _ = c.exec_command(cmds, timeout=30)
print(out.read().decode("utf-8", "replace"))
c.close()
