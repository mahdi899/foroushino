from _deploy_common import configure_stdout, connect, load_deploy_env
configure_stdout()
c = connect(load_deploy_env(), timeout=60)
_, out, _ = c.exec_command("cat /tmp/bahram-full-build.log", timeout=30)
print(out.read().decode("utf-8", "replace"))
c.close()
