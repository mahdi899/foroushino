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
cmds = [
    "test -f /tmp/family-perf-deploy.done && cat /tmp/family-perf-deploy.done || echo NO_DONE",
    "tail -100 /tmp/family-perf-deploy.log 2>/dev/null || echo NO_LOG",
    'curl -sf -o /dev/null -w "club_api:%{http_code}" -H "Host: rostami.club" http://127.0.0.1/api/v1/family/branding; echo',
    'curl -sf -o /dev/null -w "admin:%{http_code}" -H "Host: rostami.club" http://127.0.0.1/admin/; echo',
    f"grep -n 'pageVisible\\|45_000\\|30_000' {env.get('DEPLOY_APP_ROOT','/var/www/bahram-cm')}/frontend/components/family/FeedView.tsx | head -5",
    f"grep -n 'Promise.all' {env.get('DEPLOY_APP_ROOT','/var/www/bahram-cm')}/frontend/app/family/page.tsx | head -3",
    f"grep -n 'family(-manager)' /etc/nginx/sites-available/rostami-club.conf | head -3",
]
for cmd in cmds:
    print("===", cmd[:70], "===")
    _, out, _ = c.exec_command(cmd, timeout=90)
    print(out.read().decode("utf-8", "replace"))
c.close()
