from _deploy_common import configure_stdout, connect, load_deploy_env, backend_root
configure_stdout()
BE = backend_root(load_deploy_env())
c = connect(load_deploy_env(), timeout=30)
_, out, _ = c.exec_command(f"grep -E '^[A-Z_]+=' {BE}/.env | cut -d= -f1 | sort", timeout=20)
print(out.read().decode())
c.close()
