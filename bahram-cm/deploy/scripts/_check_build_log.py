import io, sys
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, _ = c.exec_command("wc -l /tmp/family-perf-finish.log; tail -80 /tmp/family-perf-finish.log; free -h; test -f /var/www/bahram-cm/frontend/.next/BUILD_ID && echo HAS_BUILD || echo NO_BUILD", timeout=120)
print(out.read().decode("utf-8", "replace"))
c.close()
