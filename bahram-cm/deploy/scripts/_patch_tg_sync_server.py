#!/usr/bin/env python3
"""Patch telegram sync fix directly on server (no git pull needed)."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

remote = f"""#!/bin/bash
set -eo pipefail
cd {BE}

python3 <<'PY'
from pathlib import Path

wc = Path("app/Modules/TelegramBot/Http/Controllers/WebhookController.php")
text = wc.read_text(encoding="utf-8")
old = '''        if ($update !== null && $update->wasRecentlyCreated) {{
            // Ack Telegram/Worker immediately; process + reply via queue (same path as broadcast).
            ProcessTelegramUpdateJob::dispatch($update->id)
                ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'))
                ->afterResponse();
        }}'''
new = '''        if ($update !== null && $update->wasRecentlyCreated) {{
            ProcessTelegramUpdateJob::dispatchSync($update->id);
        }}'''
if old in text:
    wc.write_text(text.replace(old, new), encoding="utf-8")
    print("patched WebhookController")
elif "dispatchSync" in text:
    print("WebhookController already patched")
else:
    raise SystemExit("WebhookController pattern not found")

cfg = Path("config/telegram_bot.php")
ct = cfg.read_text(encoding="utf-8")
ct = ct.replace(
    "env('TELEGRAM_OUTBOUND_SYNC', false)",
    "env('TELEGRAM_OUTBOUND_SYNC', true)",
)
cfg.write_text(ct, encoding="utf-8")
print("patched config default outbound_sync=true")
PY

if grep -q '^TELEGRAM_OUTBOUND_SYNC=' .env; then
  sed -i 's/^TELEGRAM_OUTBOUND_SYNC=.*/TELEGRAM_OUTBOUND_SYNC=true/' .env
else
  echo 'TELEGRAM_OUTBOUND_SYNC=true' >> .env
fi

php artisan config:clear
php artisan config:cache
echo DONE
"""

c = connect(env, timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/tg-patch.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/tg-patch.sh", 0o755)
sftp.close()
_, out, _ = c.exec_command("bash /tmp/tg-patch.sh 2>&1", timeout=120)
print(out.read().decode("utf-8", "replace"))
c.close()
