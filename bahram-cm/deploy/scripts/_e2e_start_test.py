"""E2E: simulate /start via worker, verify async reply."""
import json
import time
from pathlib import Path

from _deploy_common import configure_stdout, connect, load_deploy_env, backend_root

configure_stdout()
secrets = json.loads((Path(__file__).resolve().parent / "_tg_secrets.local.json").read_text(encoding="utf-8"))
BE = backend_root(load_deploy_env())
worker = secrets["worker_url"].rstrip("/")
secret = secrets["webhook_secret"]
uid = 5244383790

remote = f"""#!/bin/bash
set -e
BE="{BE}"
WH="{secret}"
WORKER="{worker}"
UID={uid}
UPDATE_ID=$((900000000 + RANDOM))

PAYLOAD=$(cat <<EOF
{{"update_id":$UPDATE_ID,"message":{{"message_id":99001,"from":{{"id":$UID,"is_bot":false,"first_name":"Test"}},"chat":{{"id":$UID,"type":"private"}},"date":$(date +%s),"text":"/start"}}}}
EOF
)

echo "=== Inject /start update_id=$UPDATE_ID ==="
code=$(curl -sk --max-time 30 -w '%{{http_code}}' -o /tmp/tg_inj.txt \\
  -X POST "$WORKER/api/v1/integrations/telegram/production/webhook" \\
  -H "Content-Type: application/json" \\
  -H "X-Telegram-Bot-Api-Secret-Token: $WH" \\
  -d "$PAYLOAD")
echo "worker_response=$code body=$(cat /tmp/tg_inj.txt)"

sleep 8

cd "$BE"
php artisan tinker --execute="
\\$u = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id', {UPDATE_ID})->first();
echo 'update_status='.(\\$u->status ?? 'missing').PHP_EOL;
\\$pending = Illuminate\\\\Support\\\\Facades\\\\Redis::connection()->llen('queues:telegram-replies');
echo 'reply_queue_len='.\\$pending.PHP_EOL;
" 2>&1

echo DONE
"""

c = connect(load_deploy_env(), timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/tg_e2e.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/tg_e2e.sh", 0o755)
sftp.close()
_, out, err = c.exec_command("bash /tmp/tg_e2e.sh", timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("ERR:", e[:300])
c.close()
