#!/usr/bin/env python3
import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm\deploy\deploy.env").read_text(encoding="utf-8").splitlines():
    line=line.strip()
    if line and not line.startswith("#") and "=" in line:
        k,v=line.split("=",1); env[k.strip()]=v.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
ROOT = Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm\frontend")

# Sync files that may differ from server
sync_files = [
    "lib/student/actions.ts",
    "lib/family/feedMerge.ts",
    "lib/family/hooks/useFamilyFeed.ts",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], int(env.get("DEPLOY_PORT","22")), env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

sftp = c.open_sftp()
for rel in sync_files:
    local = ROOT / rel
    remote = f"{APP}/frontend/{rel.replace(chr(92), '/')}"
    print(f"Upload {rel}")
    sftp.put(str(local), remote)
sftp.close()

script = f"""
set -e
APP={APP}
cd $APP/frontend
npm run build
test -f .next/BUILD_ID && echo BUILD_OK
pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --update-env
pm2 save
sleep 8
curl -sf -o /dev/null -w "NEXT:%{{http_code}}" http://127.0.0.1:3000/
echo
curl -sf -o /dev/null -w "PUBLIC_BAHRAM:%{{http_code}}" -H "Host: rostami.app" http://127.0.0.1/
echo
curl -sf -o /dev/null -w "PUBLIC_FAMILY:%{{http_code}}" -H "Host: rostami.club" http://127.0.0.1/
echo
echo ALL_DONE
"""
print("Building...")
_, o, e = c.exec_command(script, timeout=900)
out = o.read().decode("utf-8", errors="replace")
err = e.read().decode("utf-8", errors="replace")
print(out[-8000:] if len(out)>8000 else out)
if err:
    print("STDERR tail:", err[-2000:])
c.close()
