from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)
c = connect(env, timeout=60)
cmds = f"cd {BE} && (tail -40 storage/logs/laravel.log 2>/dev/null; ls storage/logs/)"
_, out, _ = c.exec_command(cmds, timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
