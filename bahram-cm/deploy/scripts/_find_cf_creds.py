"""Search server for Cloudflare credentials (filenames/l lengths only)."""
from _deploy_common import configure_stdout, connect, load_deploy_env
configure_stdout()
c = connect(load_deploy_env(), timeout=60)
cmd = r"""
find /root /var/www /home -maxdepth 5 \( -name 'wrangler.toml' -o -name '.wrangler' -o -name '*cloudflare*' -o -name 'deploy.env' \) 2>/dev/null | head -30
echo '---'
grep -rl 'CLOUDFLARE_API_TOKEN' /var/www /root 2>/dev/null | head -10
echo '---'
for f in /var/www/bahram-cm/backend/.env /var/www/foroushino/bahram-cm/backend/.env /root/.bashrc; do
  [ -f "$f" ] && echo "FILE:$f" && grep -c 'CLOUDFLARE' "$f" 2>/dev/null || true
done
"""
_, out, _ = c.exec_command(cmd, timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
