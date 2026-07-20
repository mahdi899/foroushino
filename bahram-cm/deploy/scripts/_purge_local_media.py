import io, sys
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
cmd = f"cd {APP}/backend && php artisan media:purge-local-copies --limit=500 && du -sh {APP}/backend/storage/app/public/media/family 2>/dev/null || echo 'dir gone'"
_, out, _ = c.exec_command(cmd, timeout=180)
print(out.read().decode("utf-8", "replace"))
c.close()
