<?php

namespace App\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramWebhookRegisteredNotifier;
use App\Support\SsrfGuard;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

/**
 * تنظیمات Worker تلگرام از پنل.
 */
class TelegramInfrastructureService
{
    public const GROUP = 'telegram';

    public const KEY = 'infrastructure';

    public const DEFAULT_BASE_URL = 'https://api.telegram.org';

    private const CACHE_KEY = 'telegram.infrastructure.config';

    public function __construct(private readonly SettingService $settings) {}

    /** @return array<string, mixed> */
    private function stored(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            $raw = $this->settings->group(self::GROUP)[self::KEY] ?? null;

            return is_array($raw) ? $raw : [];
        });
    }

    public static function forgetCachedConfig(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** @deprecated توکن ربات اکنون در هر ربات جداگانه ذخیره می‌شود */
    public function legacyBotToken(): ?string
    {
        $encrypted = trim((string) ($this->stored()['bot_token_encrypted'] ?? ''));
        if ($encrypted !== '') {
            try {
                return Crypt::decryptString($encrypted);
            } catch (\Throwable) {
                // encrypted value invalid — fall back to env
            }
        }

        $fromConfig = trim((string) config('telegram_bot.bots.production.token', ''));
        if ($fromConfig !== '') {
            return $fromConfig;
        }

        $env = trim((string) (
            $_ENV['TELEGRAM_BOT_TOKEN']
            ?? $_SERVER['TELEGRAM_BOT_TOKEN']
            ?? (getenv('TELEGRAM_BOT_TOKEN') ?: '')
            ?: env('TELEGRAM_BOT_TOKEN', '')
        ));

        return $env !== '' ? $env : null;
    }

    public function workerUrl(): string
    {
        return $this->usesWorkerBridge() ? $this->panelBaseUrl() : '';
    }

    public function panelBaseUrl(): string
    {
        $stored = $this->stored();
        $url = trim((string) ($stored['base_url'] ?? $stored['webhook_base_url'] ?? ''));
        if ($url !== '') {
            return rtrim($url, '/');
        }

        $env = trim((string) config('telegram_bot.webhook.base_url', ''));
        if ($env !== '') {
            return rtrim($env, '/');
        }

        return self::DEFAULT_BASE_URL;
    }

    public function usesWorkerBridge(): bool
    {
        $host = strtolower((string) parse_url($this->panelBaseUrl(), PHP_URL_HOST));

        return $host !== '' && $host !== 'api.telegram.org';
    }

    public function webhookBaseUrl(): string
    {
        if ($this->usesWorkerBridge()) {
            return $this->panelBaseUrl();
        }

        return $this->backendOrigin();
    }

    /** Outbound Bot API — through Worker when bridge is on (Iran-safe). */
    public function telegramApiBaseUrl(): string
    {
        if ($this->usesWorkerBridge()) {
            return $this->panelBaseUrl();
        }

        $env = trim((string) config('telegram_bot.api_base_url', ''));

        return $env !== '' ? rtrim($env, '/') : self::DEFAULT_BASE_URL;
    }

    public function backendOrigin(): string
    {
        $stored = trim((string) ($this->stored()['backend_origin'] ?? ''));
        if ($stored !== '') {
            return rtrim($stored, '/');
        }

        $env = trim((string) config('bahram.frontend_url', ''));
        if ($env !== '') {
            return rtrim($env, '/');
        }

        return rtrim((string) config('telegram.site_base_url', 'https://rostami.app'), '/');
    }

    public function proxySharedToken(): ?string
    {
        $stored = trim((string) ($this->stored()['proxy_shared_token'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('security.proxy_origin.shared_token', ''));

        return $env !== '' ? $env : null;
    }

    public function webhookSecret(): ?string
    {
        $stored = trim((string) ($this->stored()['webhook_secret'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $bot = TelegramBot::query()->where('key', 'production')->first();
        $fromBot = trim((string) ($bot?->webhook_secret ?? ''));

        if ($fromBot !== '') {
            return $fromBot;
        }

        $env = trim((string) env('TELEGRAM_WEBHOOK_SECRET', ''));

        return $env !== '' ? $env : null;
    }

    public function buildWebhookUrl(string $botKey = 'production'): string
    {
        return $this->webhookBaseUrl().'/'.$this->webhookPath($botKey);
    }

    public function buildServerWebhookUrl(string $botKey = 'production'): string
    {
        return $this->backendOrigin().'/'.$this->webhookPath($botKey);
    }

    private function webhookPath(string $botKey): string
    {
        return ltrim(str_replace('{botKey}', $botKey, (string) config(
            'telegram_bot.webhook.path_pattern',
            'api/v1/integrations/telegram/{botKey}/webhook',
        )), '/');
    }

    public function isConfigured(): bool
    {
        if ($this->usesWorkerBridge()) {
            return $this->proxySharedToken() !== null;
        }

        return true;
    }

  public function workerSampleTemplate(): ?string
    {
        $path = dirname(base_path()).DIRECTORY_SEPARATOR.'worker'.DIRECTORY_SEPARATOR.'deploy.sample.js';
        if (! is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        return is_string($contents) && $contents !== '' ? $contents : null;
    }

    public function buildWorkerDeploySample(?string $proxyToken = null, ?string $webhookSecret = null, ?string $botToken = null): ?string
    {
        $template = $this->workerSampleTemplate();
        if ($template === null) {
            return null;
        }

        $proxy = trim((string) ($proxyToken ?? $this->proxySharedToken() ?? ''));
        $secret = trim((string) ($webhookSecret ?? $this->webhookSecret() ?? ''));

        if ($proxy === '' || $secret === '') {
            return null;
        }

        return str_replace(
            ['__BACKEND_ORIGIN__', '__PROXY_SHARED_TOKEN__', '__TELEGRAM_WEBHOOK_SECRET__'],
            [$this->backendOrigin(), $proxy, $secret],
            $template,
        );
    }

    public function productionBotToken(): ?string
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        $token = trim((string) ($bot?->resolveToken() ?? ''));

        return $token !== '' ? $token : null;
    }

    public function hostProxySampleTemplate(): ?string
    {
        $path = dirname(base_path()).DIRECTORY_SEPARATOR.'deploy'.DIRECTORY_SEPARATOR.'host-proxy'.DIRECTORY_SEPARATOR.'index.sample.php';
        if (! is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        return is_string($contents) && $contents !== '' ? $contents : null;
    }

    public function hostProxyHtaccessTemplate(): ?string
    {
        $path = dirname(base_path()).DIRECTORY_SEPARATOR.'deploy'.DIRECTORY_SEPARATOR.'host-proxy'.DIRECTORY_SEPARATOR.'htaccess.sample';
        if (! is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        return is_string($contents) && $contents !== '' ? $contents : null;
    }

    public function buildHostProxyDeploySample(?string $proxyToken = null): ?string
    {
        $template = $this->hostProxySampleTemplate();
        if ($template === null) {
            return null;
        }

        $proxy = trim((string) ($proxyToken ?? $this->proxySharedToken() ?? ''));

        if ($proxy === '') {
            return null;
        }

        return str_replace(
            ['__BACKEND_ORIGIN__', '__PROXY_SHARED_TOKEN__'],
            [$this->backendOrigin(), $proxy],
            $template,
        );
    }

    public function buildHostProxyHtaccessSample(string $rewriteBase = '/bahram'): ?string
    {
        $template = $this->hostProxyHtaccessTemplate();
        if ($template === null) {
            return null;
        }

        $base = '/'.trim($rewriteBase, '/');
        if ($base === '/') {
            $base = '/bahram';
        }

        return str_replace('__REWRITE_BASE__', $base, $template);
    }

    /** @return array<string, mixed> */
    public function adminView(): array
    {
        $connectionToken = $this->proxySharedToken();

        return [
            'worker_url' => $this->workerUrl(),
            'mode' => $this->usesWorkerBridge() ? 'worker' : 'direct',
            'backend_origin' => $this->backendOrigin(),
            'telegram_api_base_url' => $this->telegramApiBaseUrl(),
            'server_webhook_url' => $this->buildServerWebhookUrl('production'),
            'worker_webhook_url' => $this->usesWorkerBridge() ? $this->buildWebhookUrl('production') : null,
            'has_connection_token' => $connectionToken !== null,
            'connection_token_preview' => $connectionToken ? $this->maskSecret($connectionToken) : null,
            'configured' => $this->isConfigured(),
            'worker_sample_template' => $this->workerSampleTemplate(),
            'worker_deploy_sample' => $this->buildWorkerDeploySample(),
            'host_proxy_deploy_sample' => $this->buildHostProxyDeploySample(),
            'host_proxy_htaccess_sample' => $this->buildHostProxyHtaccessSample(),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function update(array $input): array
    {
        $next = $this->stored();

        $mode = $input['mode'] ?? null;
        if ($mode === 'direct') {
            $next['base_url'] = self::DEFAULT_BASE_URL;
        } elseif (array_key_exists('base_url', $input) || array_key_exists('worker_url', $input)) {
            $raw = trim((string) ($input['worker_url'] ?? $input['base_url'] ?? ''));
            if ($raw === '') {
                if ($mode === 'worker') {
                    throw new \InvalidArgumentException('برای حالت Worker، آدرس Worker را وارد کنید.');
                }
                $next['base_url'] = self::DEFAULT_BASE_URL;
            } else {
                $url = rtrim($raw, '/');
                if ($error = SsrfGuard::validateProviderBaseUrl('telegram', $url)) {
                    throw new \InvalidArgumentException($error);
                }
                $next['base_url'] = $url;
            }
        }

        // Single active bridge only — drop any leftover dual-proxy setting.
        unset($next['secondary_base_url']);

        $connectionToken = trim((string) ($input['connection_token_input'] ?? $input['bearer_token_input'] ?? ''));
        if ($connectionToken !== '') {
            if (strlen($connectionToken) < 32) {
                throw new \InvalidArgumentException('توکن اتصال باید حداقل ۳۲ کاراکتر باشد.');
            }
            $next['proxy_shared_token'] = $connectionToken;
        }

        $webhookSecret = trim((string) ($input['webhook_secret_input'] ?? ''));
        if ($webhookSecret !== '') {
            if (strlen($webhookSecret) < 16) {
                throw new \InvalidArgumentException('رمز وب‌هوک باید حداقل ۱۶ کاراکتر باشد.');
            }
            $next['webhook_secret'] = $webhookSecret;
        }

        $this->ensureWebhookSecret($next);

        $this->settings->updateGroup(self::GROUP, [self::KEY => $next]);
        self::forgetCachedConfig();
        $this->syncProductionBotSecret();

        return $this->adminView();
    }

    /** @return array{ok: bool, message: string} */
    public function testConnection(TelegramBotClientFactory $clients): array
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null || ! filled($bot->resolveToken())) {
            return ['ok' => false, 'message' => 'توکن ربات production را در بخش ربات ذخیره کنید.'];
        }

        if ($this->usesWorkerBridge() && $this->proxySharedToken() === null) {
            return ['ok' => false, 'message' => 'برای Worker، توکن اتصال را ذخیره کنید.'];
        }

        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return ['ok' => false, 'message' => 'ربات production ثبت نشده — «همگام‌سازی از env» را بزنید.'];
        }

        try {
            $me = $clients->forBot($bot)->getMe();
            $username = (string) ($me['username'] ?? '?');
            $mode = $this->usesWorkerBridge() ? 'Worker' : 'مستقیم';

            return ['ok' => true, 'message' => "اتصال برقرار (@{$username}) — {$mode}"];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'خطا: '.$e->getMessage()];
        }
    }

    /** @return array{ok: bool, message: string, url?: string} */
    public function registerProductionWebhook(TelegramBotClientFactory $clients): array
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null || ! filled($bot->resolveToken())) {
            return ['ok' => false, 'message' => 'توکن ربات production را در بخش ربات ذخیره کنید.'];
        }

        if ($this->usesWorkerBridge() && $this->proxySharedToken() === null) {
            return ['ok' => false, 'message' => 'توکن Worker را ذخیره کنید.'];
        }

        $url = $this->buildWebhookUrl('production');
        $this->syncProductionBotSecret();
        $secret = $this->webhookSecret();

        try {
            $clients->forBot($bot)->setWebhook($url, $secret);
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => $this->formatWebhookRegistrationError($e)];
        }

        $mode = $this->usesWorkerBridge() ? 'Cloudflare Worker' : 'مستقیم';
        app(TelegramWebhookRegisteredNotifier::class)->notify($bot, $url, $mode);

        return ['ok' => true, 'message' => 'وب‌هوک در تلگرام ثبت شد.', 'url' => $url];
    }

    /** @param  array<string, mixed>  $next */
    private function ensureWebhookSecret(array &$next): void
    {
        if (trim((string) ($next['webhook_secret'] ?? '')) !== '') {
            return;
        }

        if ($this->webhookSecret() !== null) {
            return;
        }

        $next['webhook_secret'] = Str::random(32);
    }

    public function syncProductionBotSecret(): void
    {
        $secret = trim((string) ($this->stored()['webhook_secret'] ?? ''));
        if ($secret === '') {
            return;
        }

        TelegramBot::query()->where('key', 'production')->update(['webhook_secret' => $secret]);
    }

    private function maskSecret(string $value): string
    {
        if (strlen($value) <= 8) {
            return '••••';
        }

        return substr($value, 0, 4).'…'.substr($value, -4);
    }

    private function formatWebhookRegistrationError(\Throwable $e): string
    {
        $message = trim($e->getMessage());
        $base = 'ثبت وب‌هوک ناموفق';
        $detail = $message !== '' ? ': '.$message : '';

        if ($this->usesWorkerBridge()) {
            if ($this->isLikelyTelegramConnectivityFailure($e)) {
                return $base.$detail
                    .' — Worker را Deploy کرده‌اید؟ توکن اتصال Worker با پنل یکی باشد.'
                    .' لاگ: storage/logs/telegram.log';
            }

            return $base.$detail.' — Worker: '.$this->workerUrl();
        }

        if ($this->isLikelyTelegramConnectivityFailure($e)) {
            return $base.$detail
                .' — api.telegram.org از این شبکه در دسترس نیست؛ حالت Worker را فعال کنید یا از VPN استفاده کنید.'
                .' لاگ: storage/logs/telegram.log';
        }

        return $base.$detail;
    }

    private function isLikelyTelegramConnectivityFailure(\Throwable $e): bool
    {
        if ($e instanceof \Illuminate\Http\Client\ConnectionException) {
            return true;
        }

        $message = strtolower($e->getMessage());

        return str_contains($message, 'connection')
            || str_contains($message, 'timed out')
            || str_contains($message, 'timeout')
            || str_contains($message, 'could not resolve')
            || str_contains($message, 'ssl')
            || str_contains($message, 'curl error');
    }
}
