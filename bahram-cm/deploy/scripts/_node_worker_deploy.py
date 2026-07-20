"""Upgrade Node to 22 on server + deploy worker if CF token available."""
import time

from _deploy_common import app_root, backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

remote = f"""#!/bin/bash
set -e
LOG=/tmp/bahram-node-worker.log
: > "$LOG"
echo "=== NODE+WORKER $(date -Is) ===" >> "$LOG"

# Node 22 for wrangler
if ! node -v 2>/dev/null | grep -q '^v22'; then
  echo "Installing Node 22..." >> "$LOG"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >> "$LOG" 2>&1
  apt-get install -y nodejs >> "$LOG" 2>&1
fi
echo "node $(node -v)" >> "$LOG"

cd {APP}/worker
npm install >> "$LOG" 2>&1

# CF token: env then panel settings
CF=""
CF=$(grep -E '^CLOUDFLARE_API_TOKEN=' {BE}/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -z "$CF" ]; then
  CF=$(php -r 'require "{BE}/vendor/autoload.php"; $a=require "{BE}/bootstrap/app.php"; $a->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); echo trim((string)(app(App\\Services\\SettingService::class)->group("cache")["cloudflare_api_token"] ?? ""));' 2>/dev/null || true)
fi

PROXY=$(php -r 'require "{BE}/vendor/autoload.php"; $a=require "{BE}/bootstrap/app.php"; $a->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); echo app(App\\Services\\TelegramInfrastructureService::class)->proxySharedToken() ?? "";' 2>/dev/null)

if [ -n "$CF" ]; then
  export CLOUDFLARE_API_TOKEN="$CF"
  echo "wrangler deploy..." >> "$LOG"
  npx wrangler deploy >> "$LOG" 2>&1
  if [ -n "$PROXY" ]; then
    printf '%s' "$PROXY" | npx wrangler secret put PROXY_SHARED_TOKEN >> "$LOG" 2>&1
  fi
  echo WORKER_DEPLOYED >> "$LOG"
else
  echo "NO_CF_TOKEN skip wrangler" >> "$LOG"
fi

cd {BE}
php artisan config:cache >> "$LOG" 2>&1
supervisorctl restart bahram-horizon >> "$LOG" 2>&1 || true

php artisan tinker --execute="
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first());
\\$r = \\$c->sendMessage(5244383790, '🤖 Worker+Node setup — '.date('H:i:s'));
echo 'msg_id='.(\\$r['message_id']??'?').PHP_EOL;
" >> "$LOG" 2>&1

echo DONE >> "$LOG"
"""

c = connect(env, timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/bahram-node-worker.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/bahram-node-worker.sh", 0o755)
sftp.close()

print("Upgrading Node + worker deploy attempt...")
c.exec_command("rm -f /tmp/bahram-node-worker.done; nohup bash /tmp/bahram-node-worker.sh; echo $? > /tmp/bahram-node-worker.done")

for i in range(40):
    time.sleep(10)
    _, out, _ = c.exec_command("test -f /tmp/bahram-node-worker.done && cat /tmp/bahram-node-worker.done || echo running", timeout=10)
    if out.read().decode().strip() != "running":
        break
    if i % 3 == 0:
        _, tail, _ = c.exec_command("tail -1 /tmp/bahram-node-worker.log 2>/dev/null", timeout=10)
        t = tail.read().decode().strip()
        if t:
            print("...", t[:100])

_, log_out, _ = c.exec_command("cat /tmp/bahram-node-worker.log", timeout=30)
print(log_out.read().decode("utf-8", "replace"))
c.close()
