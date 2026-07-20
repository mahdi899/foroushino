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
cmds = [
    f"tail -300 {APP}/backend/storage/logs/laravel.log 2>/dev/null | tail -80",
    f"cd {APP}/backend && php artisan tinker --execute=\"echo json_encode(\\\\App\\\\Models\\\\FamilyMedia::query()->orderByDesc('id')->limit(5)->get(['id','type','status','failure_reason','size','created_at'])->toArray());\"",
    f"cd {APP}/backend && php artisan queue:failed --queue=family-media 2>/dev/null | head -20",
    "grep -A2 'family-manager/media' /etc/nginx/sites-available/rostami-club.conf | head -20",
    "curl -sk -X POST -H 'Host: rostami.club' -H 'Accept: application/json' https://127.0.0.1/api/v1/family-manager/media -o /dev/null -w 'upload_no_auth:%{http_code}\\n'",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:75], "===")
    _, out, err = c.exec_command(cmd, timeout=120)
    print(out.read().decode("utf-8", "replace"))
    e = err.read().decode("utf-8", "replace")
    if e.strip():
        print("ERR:", e[:400])
c.close()
