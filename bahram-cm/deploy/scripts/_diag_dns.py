from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)
c = connect(env, timeout=60)
cmds = f"""
echo '=== DNS ==='
nslookup broken-mountain-6b4f.shokspy.workers.dev 2>&1 | head -10
grep -E '^nameserver' /etc/resolv.conf 2>/dev/null | head -5

echo '=== CURL WORKER ==='
curl -s -o /dev/null -w 'worker_http=%{{http_code}} time=%{{time_total}}\\n' --max-time 15 https://broken-mountain-6b4f.shokspy.workers.dev/ 2>&1

echo '=== RECENT SEND ERRORS ==='
grep sendMessage {BE}/storage/logs/telegram-2026-07-21.log | tail -15

grep CLOUDFLARE {BE}/.env 2>/dev/null | sed 's/=.*/=***/'
"""
_, out, _ = c.exec_command(cmds, timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
