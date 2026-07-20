from _deploy_common import configure_stdout, connect, load_deploy_env
configure_stdout()
c = connect(load_deploy_env(), timeout=60)

cmds = [
    "node -v && npm -v",
    "ps aux | grep -E 'npm|next|bahram-frontend' | grep -v grep | head -10",
    "test -f /tmp/bahram-frontend-build.done && cat /tmp/bahram-frontend-build.done || echo no-done",
    "test -f /tmp/bahram-full-build.done && cat /tmp/bahram-full-build.done || echo no-full-done",
    "wc -l /tmp/bahram-frontend-build.log /tmp/bahram-full-build.log 2>/dev/null",
    "tail -30 /tmp/bahram-full-build.log 2>/dev/null",
]
for cmd in cmds:
    print(f"\n=== {cmd} ===")
    _, out, err = c.exec_command(cmd, timeout=30)
    print(out.read().decode("utf-8", "replace"))
    e = err.read().decode("utf-8", "replace")
    if e.strip():
        print("ERR:", e)

c.close()
