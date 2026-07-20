"""Ensure Laravel schedule:run cron exists for www-data."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
CRON_LINE="* * * * * cd {BE} && php artisan schedule:run >> /dev/null 2>&1"
( crontab -u www-data -l 2>/dev/null | grep -v schedule:run || true; echo "$CRON_LINE" ) | crontab -u www-data -
echo "=== www-data crontab ==="
crontab -u www-data -l 2>/dev/null | grep schedule:run || echo still missing
"""

c = connect(env)
_, out, _ = c.exec_command(cmds, timeout=30)
print(out.read().decode("utf-8", "replace"))
c.close()
