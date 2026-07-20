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
PATH = "media/family/2026/07/image/01ky0hn1cvj0qaz4ymftkwndet.jpg"
cmds = [
    f"cd {APP}/backend && php artisan tinker --execute=\"echo json_encode(\\\\App\\\\Models\\\\FamilyMedia::query()->where('storage_path','like','%01ky0hn1%')->first(['id','disk','storage_path','status','temp_path','size'])?->toArray());\"",
    f"test -f {APP}/backend/storage/app/public/{PATH} && echo LOCAL_PUBLIC=YES || echo LOCAL_PUBLIC=NO",
    f"ls -la {APP}/backend/storage/app/family-ingest 2>/dev/null | tail -5",
    f"grep FAMILY_MEDIA {APP}/backend/.env | grep -v PASSWORD",
    f"cd {APP}/backend && php artisan media:purge-local-copies --dry-run 2>/dev/null | head -20 || php artisan list | grep purge",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:70], "===")
    _, out, _ = c.exec_command(cmd, timeout=90)
    print(out.read().decode("utf-8", "replace"))
c.close()
