"""Purge all stuck Telegram updates: remote pending, local DB, Redis queues, failed jobs."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

local_php = ROOT / "backend/storage/app/_purge_tg_pending.php"
remote_rel = "backend/storage/app/_purge_tg_pending.php"

c = connect(env, timeout=180)
upload_files(c, [(local_php, remote_rel)], env)

cmds = f"""
set -e
cd {BE}
php storage/app/_purge_tg_pending.php 2>&1
rm -f storage/app/_purge_tg_pending.php
supervisorctl restart bahram-horizon
sleep 2
supervisorctl status bahram-horizon | head -2
"""

_, out, err = c.exec_command(cmds, timeout=180)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
