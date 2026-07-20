import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
cmds = [
    f"grep -iE 'media|upload|optimize|validation|family-manager|TransferFamily|422|413' {APP}/backend/storage/logs/laravel-2026-07-20.log | tail -40",
    f"cd {APP}/backend && php artisan tinker --execute=\"echo json_encode(\\\\App\\\\Models\\\\FamilyMedia::orderByDesc('id')->limit(10)->get(['id','type','status','failure_reason','created_at'])->toArray());\"",
    f"cd {APP}/backend && php artisan queue:failed | head -15",
    "grep 'family-manager/media' /var/log/nginx/access.log 2>/dev/null | tail -10",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:72], "===")
    _, out, _ = c.exec_command(cmd, timeout=120)
    print(out.read().decode("utf-8", "replace"))
c.close()
