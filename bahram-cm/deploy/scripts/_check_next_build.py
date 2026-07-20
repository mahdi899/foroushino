from _deploy_common import app_root, configure_stdout, connect, load_deploy_env
configure_stdout()
APP = app_root(env=load_deploy_env())
c = connect(load_deploy_env(), timeout=60)
paths = [
    f"{APP}/frontend/.next/BUILD_ID",
    "/var/www/foroushino/bahram-cm/frontend/.next/BUILD_ID",
    "/var/www/bahram-cm/frontend/.next/BUILD_ID",
]
for p in paths:
    _, out, _ = c.exec_command(f"test -f {p} && echo OK:{p} || echo MISSING:{p}", timeout=10)
    print(out.read().decode().strip())
_, out, _ = c.exec_command("readlink -f /var/www/bahram-cm; ls -la /var/www/bahram-cm/frontend/.next 2>&1 | head -5", timeout=10)
print(out.read().decode())
c.close()
