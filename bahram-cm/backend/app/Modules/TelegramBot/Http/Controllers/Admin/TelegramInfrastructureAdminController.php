<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Services\TelegramHostAccountSnapshotService;
use App\Services\TelegramHostAccountSync;
use App\Services\TelegramHostPushService;
use App\Services\TelegramHostPushState;
use App\Services\TelegramInfrastructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TelegramInfrastructureAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramInfrastructureService $infrastructure,
        private readonly TelegramBotClientFactory $clients,
        private readonly TelegramHostPushService $hostPush,
        private readonly TelegramHostAccountSync $hostAccountSync,
        private readonly TelegramHostAccountSnapshotService $hostSnapshots,
        private readonly TelegramHostPushState $hostPushState,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json(['data' => $this->infrastructure->adminView()]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        $data = $request->validate([
            'mode' => ['sometimes', 'nullable', 'string', 'in:direct,worker,host'],
            'worker_url' => ['sometimes', 'nullable', 'string', 'max:512'],
            'base_url' => ['sometimes', 'nullable', 'string', 'max:512'],
            'connection_token_input' => ['sometimes', 'nullable', 'string', 'max:256'],
            'bearer_token_input' => ['sometimes', 'nullable', 'string', 'max:256'],
            'webhook_secret_input' => ['sometimes', 'nullable', 'string', 'max:256'],
        ]);

        if ($request->exists('worker_url')) {
            $data['worker_url'] = trim((string) $request->input('worker_url', ''));
        }

        try {
            $view = $this->infrastructure->update($data);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => ['code' => 'validation_error', 'message_fa' => $e->getMessage()],
            ], 422);
        }

        return response()->json(['data' => $view]);
    }

    public function registerWebhook(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json([
            'data' => $this->infrastructure->registerProductionWebhook($this->clients),
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json([
            'data' => $this->infrastructure->testConnection($this->clients),
        ]);
    }

    public function regenerateHostSecrets(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json(['data' => $this->infrastructure->regenerateHostSecrets()]);
    }

    public function suggestSecrets(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json([
            'data' => [
                'bearer_token' => Str::random(64),
                'webhook_secret' => Str::random(32),
            ],
        ]);
    }

    public function pushHostSync(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        $data = $request->validate([
            'scope' => ['sometimes', 'string', 'in:bootstrap,catalog,accounts,full'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
        ]);

        $scope = (string) ($data['scope'] ?? 'full');
        $limit = max(1, (int) ($data['limit'] ?? 100));

        $result = [
            'scope' => $scope,
            'bootstrap' => null,
            'catalog' => null,
            'accounts_pushed' => 0,
            'accounts_failed' => 0,
            'ok' => true,
            'message' => '',
        ];

        if ($preflight = $this->hostPushPreflightMessage()) {
            $result['ok'] = false;
            $result['message'] = $preflight;

            return $this->pushHostSyncResponse($result);
        }

        if (in_array($scope, ['bootstrap', 'full'], true)) {
            $result['bootstrap'] = $this->hostPush->refreshBootstrap();
        }

        if (in_array($scope, ['catalog', 'full'], true)) {
            $result['catalog'] = $this->hostPush->refreshCatalog();
        }

        if (in_array($scope, ['accounts', 'full'], true)) {
            $accounts = $this->hostAccountSync->accountsNeedingReconcile($limit);
            $accounts->each(function (TelegramAccount $account) use (&$result): void {
                try {
                    $payload = $this->hostSnapshots->accountPayload($account->fresh(['user', 'bot']));
                    if ($this->hostPush->pushAccount($payload)) {
                        $result['accounts_pushed']++;
                    } else {
                        $result['accounts_failed']++;
                    }
                } catch (\Throwable $e) {
                    $result['accounts_failed']++;
                    Log::channel('telegram')->error('telegram.host.push_account_snapshot_failed', [
                        'telegram_user_id' => $account->telegram_user_id,
                        'user_id' => $account->user_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            });
        }

        $parts = [];
        if ($result['bootstrap'] !== null) {
            $parts[] = $result['bootstrap'] ? 'bootstrap: ok' : 'bootstrap: ناموفق';
        }
        if ($result['catalog'] !== null) {
            $parts[] = $result['catalog'] ? 'catalog: ok' : 'catalog: ناموفق';
        }
        if (in_array($scope, ['accounts', 'full'], true)) {
            $parts[] = sprintf(
                'accounts: %d ok, %d failed',
                $result['accounts_pushed'],
                $result['accounts_failed'],
            );
        }

        $result['message'] = $parts !== [] ? implode(' · ', $parts) : 'انجام شد.';
        $result['ok'] = ($result['bootstrap'] ?? true)
            && ($result['catalog'] ?? true)
            && $result['accounts_failed'] === 0;

        if (! $result['ok']) {
            $result['message'] = $this->hostPushFailureMessage($result['message']);
        }

        return $this->pushHostSyncResponse($result);
    }

    /** @param  array<string, mixed>  $result */
    private function pushHostSyncResponse(array $result): JsonResponse
    {
        $payload = ['data' => $result];
        if (! ($result['ok'] ?? false)) {
            $payload['error'] = [
                'code' => 'host_push_failed',
                'message_fa' => (string) ($result['message'] ?? 'پوش به هاست خارج ناموفق بود.'),
            ];
        }

        // Always 200 — the panel reads `data.ok` and shows `message`; HTTP 502 hid
        // the real failure behind a generic "Admin API 502" in the UI.
        return response()->json($payload);
    }

    private function hostPushPreflightMessage(): ?string
    {
        if (! $this->infrastructure->usesHostBridge()) {
            return 'حالت «هاست خارج» فعال نیست. از تنظیمات کامل ربات، اتصال را روی هاست PHP بگذارید.';
        }

        if ($this->infrastructure->hostPushUrl() === '') {
            return 'آدرس پوش به هاست خارج تنظیم نشده. در تنظیمات زیرساخت، URL هاست یا TELEGRAM_HOST_PUSH_URL را وارد کنید.';
        }

        if ($this->infrastructure->hostSyncSecret() === null) {
            return 'کلید همگام‌سازی هاست (Bearer) تنظیم نشده. در تنظیمات زیرساخت، کلید را ذخیره یا دوباره بسازید.';
        }

        if ($this->hostPushState->isCircuitOpen()) {
            $retry = $this->hostPushState->secondsUntilRetry();

            return sprintf(
                'هاست خارج چند بار پاسخ نداد؛ %d ثانیه دیگر دوباره تلاش کنید. اگر ادامه داشت، فایروال/WAF یا آدرس پوش (%s) را بررسی کنید.',
                $retry,
                $this->infrastructure->hostPushUrl(),
            );
        }

        return null;
    }

    private function hostPushFailureMessage(string $technical): string
    {
        $hints = [];
        if (str_contains($technical, 'bootstrap: ناموفق')) {
            $hints[] = 'bootstrap: ربات production یا توکن/تنظیماتش را در همین پنل بررسی کنید';
        }
        if (str_contains($technical, 'catalog: ناموفق')) {
            $hints[] = 'catalog: اتصال به هاست خارج یا Worker پوش قطع است';
        }
        if (preg_match('/accounts: \d+ ok, ([1-9]\d*) failed/', $technical, $matches) === 1) {
            $hints[] = sprintf('%s اکانت به هاست پوش نشد — لاگ telegram را ببینید', $matches[1]);
        }

        $hintText = $hints !== [] ? ' ('.implode(' · ', $hints).')' : '';
        $hostUrl = $this->infrastructure->hostPushUrl();

        return sprintf(
            'پوش به هاست خارج ناموفق: %s%s. آدرس پوش: %s',
            $technical,
            $hintText,
            $hostUrl !== '' ? $hostUrl : '—',
        );
    }
}
