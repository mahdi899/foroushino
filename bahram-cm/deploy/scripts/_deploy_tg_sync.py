#!/usr/bin/env python3
"""Deploy sync telegram webhook fix to production."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)
GIT = env.get("DEPLOY_GIT_ROOT", "/var/www/foroushino")

remote = f"""#!/bin/bash
set -eo pipefail
cd {GIT}
git fetch origin main
git pull --ff-only origin main
cd {BE}

# Enable inline replies (skip telegram-replies queue hop)
if grep -q '^TELEGRAM_OUTBOUND_SYNC=' .env; then
  sed -i 's/^TELEGRAM_OUTBOUND_SYNC=.*/TELEGRAM_OUTBOUND_SYNC=true/' .env
else
  echo 'TELEGRAM_OUTBOUND_SYNC=true' >> .env
fi

php artisan config:clear
php artisan config:cache

echo '=== smoke test webhook path ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$proxy = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->proxySharedToken() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$payload = json_encode(['update_id'=>777000099,'message'=>['message_id'=>99,'from'=>['id'=>97343715],'chat'=>['id'=>97343715,'type'=>'private'],'date'=>time(),'text'=>'/start']]);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30]);
\\$body = curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
echo 'worker_test_http='.\\$code.' body='.substr((string)\\$body,0,60).PHP_EOL;
" 2>&1

echo DONE
"""

c = connect(env, timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/tg-sync-deploy.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/tg-sync-deploy.sh", 0o755)
sftp.close()
_, out, err = c.exec_command("bash /tmp/tg-sync-deploy.sh 2>&1", timeout=180)
print(out.read().decode("utf-8", "replace"))
if err.read().decode().strip():
    print("STDERR", err.read())
c.close()
