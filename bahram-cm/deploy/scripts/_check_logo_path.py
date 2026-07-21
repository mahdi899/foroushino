#!/usr/bin/env python3
import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120, banner_timeout=120)
cmd = r"""
set +e
echo '=== site media ==='
ls -la /var/www/foroushino/bahram-cm/backend/storage/app/public/media/site 2>&1 | head -40
echo '=== find logo ==='
find /var/www -name 'logo-bahram*' 2>/dev/null | head -20
echo '=== bahram-cm path ==='
readlink -f /var/www/bahram-cm 2>/dev/null; ls -ld /var/www/bahram-cm /var/www/foroushino/bahram-cm 2>&1 | head -5
echo '=== feedDebug ==='
ls -la /var/www/bahram-cm/frontend/lib/family/feedDebug.ts /var/www/foroushino/bahram-cm/frontend/lib/family/feedDebug.ts 2>&1 | head -5
grep -n "shouldMirrorToConsole\|Opt-in only" /var/www/bahram-cm/frontend/lib/family/feedDebug.ts /var/www/foroushino/bahram-cm/frontend/lib/family/feedDebug.ts 2>/dev/null | head -10
"""
_, o, e = c.exec_command(cmd, timeout=90)
print(o.read().decode("utf-8", "replace"))
err = e.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR", err[-1500:])
c.close()
