#!/usr/bin/env python3
"""Patch RegistrationFlowService queueMessage to sync outbound on server + test /start."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

remote = f"""#!/bin/bash
set -eo pipefail
cd {BE}

python3 <<'PY'
from pathlib import Path

# --- RegistrationFlowService ---
p = Path('app/Modules/TelegramBot/Services/RegistrationFlowService.php')
t = p.read_text(encoding='utf-8')

# Remove unused job import if present
t2 = t.replace(
    'use App\\\\Modules\\\\TelegramBot\\\\Jobs\\\\SendTelegramMessageJob;\\n',
    '',
)

# Ensure constructor has outbound
if 'TelegramOutboundMessenger $outbound' not in t2:
    old = '''        private readonly TelegramAdminUserStatsService $adminUserStats,
        private readonly OtpService $otp,
    ) {{}}'''
    new = '''        private readonly TelegramAdminUserStatsService $adminUserStats,
        private readonly OtpService $otp,
        private readonly TelegramOutboundMessenger $outbound,
    ) {{}}'''
    if old not in t2:
        raise SystemExit('RegistrationFlowService ctor pattern missing')
    t2 = t2.replace(old, new)

old_qm = '''    private function queueMessage(TelegramBot $bot, int $chatId, string $text, array $options = []): void
    {{
        SendTelegramMessageJob::dispatch($bot->id, $chatId, $text, $options)
            ->onQueue((string) config('telegram_bot.queues.replies', 'telegram-replies'));
    }}'''
new_qm = '''    private function queueMessage(TelegramBot $bot, int $chatId, string $text, array $options = []): void
    {{
        $this->outbound->reply($bot, $chatId, $text, $options);
    }}'''
if old_qm in t2:
    t2 = t2.replace(old_qm, new_qm)
    print('patched RegistrationFlowService queueMessage')
elif '$this->outbound->reply($bot, $chatId, $text, $options)' in t2:
    print('RegistrationFlowService already patched')
else:
    raise SystemExit('queueMessage pattern not found')

p.write_text(t2, encoding='utf-8')

# --- RequiredChatMembershipService ---
p2 = Path('app/Modules/TelegramBot/Services/RequiredChatMembershipService.php')
t = p2.read_text(encoding='utf-8')
t = t.replace('use App\\\\Modules\\\\TelegramBot\\\\Jobs\\\\SendTelegramMessageJob;\\n', '')
if 'TelegramOutboundMessenger $outbound' not in t:
    t = t.replace(
        'private readonly TelegramBotClientFactory $clientFactory,\\n    ) {{}}',
        'private readonly TelegramBotClientFactory $clientFactory,\\n        private readonly TelegramOutboundMessenger $outbound,\\n    ) {{}}',
    )
old = '''        SendTelegramMessageJob::dispatch(
            $bot->id,
            $account->telegram_user_id,
            $message,
            [
                'reply_markup' => ['inline_keyboard' => $buttons],
            ],
        )->onQueue(config('telegram_bot.queues.replies'));'''
new = '''        $this->outbound->reply(
            $bot,
            $account->telegram_user_id,
            $message,
            [
                'reply_markup' => ['inline_keyboard' => $buttons],
            ],
        );'''
if old in t:
    t = t.replace(old, new)
    print('patched RequiredChatMembershipService')
elif '$this->outbound->reply(' in t and 'membership:recheck' in t:
    print('RequiredChatMembershipService already patched')
else:
    # try softer match
    if 'SendTelegramMessageJob::dispatch' in t:
        raise SystemExit('RequiredChatMembershipService dispatch still present, pattern mismatch')
    print('RequiredChatMembershipService ok')
p2.write_text(t, encoding='utf-8')
print('files written')
PY

php artisan config:clear
php artisan config:cache

# Restart php-fpm opcache
systemctl reload php8.4-fpm 2>/dev/null || systemctl reload php8.3-fpm 2>/dev/null || true
php -r "if (function_exists('opcache_reset')) {{ opcache_reset(); echo 'opcache_reset\\n'; }}"

echo '=== TEST SYNC START FOR REAL USER ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$a = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_user_id', 5244383790)->first();
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\ConversationService::class)->forAccount(\\$a);
\\$t0 = microtime(true);
app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\RegistrationFlowService::class)->start(\\$bot, \\$a, \\$c);
echo 'start_ms='.round((microtime(true)-\\$t0)*1000).PHP_EOL;
echo 'replies_llen='.Illuminate\\\\Support\\\\Facades\\\\Redis::llen('queues:telegram-replies').PHP_EOL;
" 2>&1

echo '=== LIVE WEBHOOK /start AS REAL USER ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$uid = 777200000 + random_int(1, 99999);
\\$payload = json_encode([
  'update_id' => \\$uid,
  'message' => [
    'message_id' => random_int(10000,99999),
    'from' => ['id' => 5244383790, 'is_bot' => false, 'first_name' => 'Test', 'username' => 'u'],
    'chat' => ['id' => 5244383790, 'type' => 'private'],
    'date' => time(),
    'text' => '/start',
  ],
]);
\\$t0 = microtime(true);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>45]);
\\$body = curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
echo 'http='.\\$code.' ms='.round((microtime(true)-\\$t0)*1000).' body='.substr((string)\\$body,0,80).PHP_EOL;
\\$row = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id', \\$uid)->first();
echo 'status='.(\\$row?->status?->value ?? 'missing').PHP_EOL;
" 2>&1

echo DONE
"""

c = connect(env, timeout=180)
sftp = c.open_sftp()
with sftp.file("/tmp/patch-start-sync.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/patch-start-sync.sh", 0o755)
sftp.close()
_, out, _ = c.exec_command("bash /tmp/patch-start-sync.sh 2>&1", timeout=180)
print(out.read().decode("utf-8", "replace"))
c.close()
