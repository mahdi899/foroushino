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
remote = f"""#!/bin/bash
cd {APP}/backend
php artisan tinker --execute="
\\$m = \\\\App\\\\Models\\\\FamilyMedia::find(25);
echo 'cdnUrl=' . \\$m->cdnUrl() . PHP_EOL;
echo 'fromPath=' . \\\\App\\\\Support\\\\FamilyMediaUrl::fromPath(\\$m->storage_path, \\$m->disk) . PHP_EOL;
"
curl -sk -H 'Host: rostami.club' 'https://127.0.0.1/media/family/2026/07/image/01ky0hn1cvj0qaz4ymftkwndet.jpg' -o /dev/null -w 'club_proxy:%{{http_code}} size:%{{size_download}}\\n'
curl -sk 'https://cdn.rostami.app/media/family/2026/07/image/01ky0hn1cvj0qaz4ymftkwndet.jpg' -o /dev/null -w 'cdn_direct:%{{http_code}} size:%{{size_download}}\\n'
du -sh {APP}/backend/storage/app/public/media/family 2>/dev/null || echo 'no local family dir'
"""
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, _ = c.exec_command(remote, timeout=90)
print(out.read().decode("utf-8", "replace"))
c.close()
