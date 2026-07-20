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
TOKEN=$(php artisan tinker --execute="echo \\\\App\\\\Models\\\\User::query()->whereHas('roles')->orderBy('id')->value('id');" 2>/dev/null | tail -1)
echo USER_ID=$TOKEN
# create sanctum token for first admin-ish user
OUT=$(php artisan tinker --execute="
\\$u = \\\\App\\\\Models\\\\User::query()->whereHas('roles')->first();
if (!\\$u) {{ echo 'NO_USER'; exit; }}
echo \\$u->createToken('upload-test')->plainTextToken;
" 2>/dev/null | tail -1)
echo TOKEN_PREFIX=${{OUT:0:20}}
# tiny png
printf '\\x89PNG\\r\\n\\x1a\\n' > /tmp/tiny.png
# test with optimize_images=true as form string (like Flutter web)
curl -sk -X POST "https://127.0.0.1/api/v1/family-manager/media" \\
  -H "Host: rostami.club" \\
  -H "Authorization: Bearer $OUT" \\
  -H "Accept: application/json" \\
  -F "type=image" \\
  -F "file=@/tmp/tiny.png;type=image/png" \\
  -F "optimize_images=true"
echo
echo "--- with bool via curl ---"
curl -sk -X POST "https://127.0.0.1/api/v1/family-manager/media" \\
  -H "Host: rostami.club" \\
  -H "Authorization: Bearer $OUT" \\
  -H "Accept: application/json" \\
  -F "type=image" \\
  -F "file=@/tmp/tiny.png;type=image/png" \\
  -F "optimize_images=1"
echo
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/test-upload.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/test-upload.sh", 0o755)
sftp.close()
_, out, err = c.exec_command("bash /tmp/test-upload.sh", timeout=120)
print(out.read().decode("utf-8", "replace"))
print(err.read().decode("utf-8", "replace")[:500])
c.close()
