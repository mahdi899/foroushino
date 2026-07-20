from _deploy_common import app_root, configure_stdout, connect, load_deploy_env
configure_stdout()
APP = app_root(load_deploy_env())
c = connect(load_deploy_env(), timeout=60)
cmds = f"""
pm2 logs bahram-frontend --lines 30 --nostream 2>&1
echo '---'
cat {APP}/deploy/pm2/ecosystem.config.cjs | head -40
echo '---'
pm2 describe bahram-frontend 2>&1 | tail -20
"""
_, out, _ = c.exec_command(cmds, timeout=30)
print(out.read().decode("utf-8", "replace"))
c.close()
