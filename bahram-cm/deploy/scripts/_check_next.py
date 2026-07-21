import time
from _deploy_common import configure_stdout, connect, load_deploy_env
configure_stdout()
c = connect(load_deploy_env(), timeout=60)
time.sleep(10)
_, out, _ = c.exec_command("pm2 list; curl -sf -o /dev/null -w 'NEXT:%{http_code}\\n' http://127.0.0.1:3000/ || echo NEXT_FAIL", timeout=30)
print(out.read().decode())
c.close()
