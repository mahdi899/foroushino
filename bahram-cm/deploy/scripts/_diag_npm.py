from _deploy_common import configure_stdout, connect, load_deploy_env, app_root
configure_stdout()
env = load_deploy_env()
APP = app_root(env)
c = connect(env, timeout=120)

cmds = [
    "dmesg 2>/dev/null | grep -i 'killed process' | tail -5 || journalctl -k --no-pager | grep -i oom | tail -5",
    f"ls -la {APP}/frontend/node_modules/.package-lock.json 2>/dev/null; ls {APP}/frontend/.next/BUILD_ID 2>/dev/null || echo NO_BUILD",
    f"cd {APP}/frontend && timeout 120 npm ci 2>&1 | tail -30; echo EXIT=$?",
]
for cmd in cmds:
    print(f"\n=== {cmd[:80]} ===")
    _, out, err = c.exec_command(cmd, timeout=180)
    print(out.read().decode("utf-8", "replace"))
    e = err.read().decode("utf-8", "replace")
    if e.strip():
        print("ERR:", e[:500])

c.close()
