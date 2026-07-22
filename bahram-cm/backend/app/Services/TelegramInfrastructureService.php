<?php

namespace App\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramWebhookRegisteredNotifier;
use App\Support\AesGcmCipher;
use App\Support\SsrfGuard;
use App\Jobs\PushTelegramHostSyncJob;
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

    /** Relative entry points inside the standalone `telegram/` host app. */
    public const HOST_WEBHOOK_ENTRY = '/public/webhook.php';

    public const HOST_PUSH_ENTRY = '/public/host-sync.php';

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

    /** Public base URL of the standalone `telegram/` app (no trailing slash). */
    public function hostAppBaseUrl(): string
    {
        return rtrim($this->panelBaseUrl(), '/');
    }

    public function hostWebhookUrl(): string
    {
        return $this->hostAppBaseUrl().self::HOST_WEBHOOK_ENTRY;
    }

    public function hostPushUrl(): string
    {
        return $this->hostAppBaseUrl().self::HOST_PUSH_ENTRY;
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
        $type = trim((string) ($this->stored()['bridge_type'] ?? ''));
        if ($type === 'worker') {
            return true;
        }
        if (in_array($type, ['direct', 'host'], true)) {
            return false;
        }

        // Back-compat: no explicit type saved yet — derive from base URL host.
        $host = strtolower((string) parse_url($this->panelBaseUrl(), PHP_URL_HOST));

        return $host !== '' && $host !== 'api.telegram.org';
    }

    /**
     * Explicit bridge type — persisted, not derived — so "Worker" (dumb relay,
     * no local state) and "Host" (full external app with its own DB/cache) can
     * be told apart even though both currently route the webhook through a
     * non-api.telegram.org `base_url`.
     */
    public function bridgeType(): string
    {
        $stored = trim((string) ($this->stored()['bridge_type'] ?? ''));
        if (in_array($stored, ['direct', 'worker', 'host'], true)) {
            return $stored;
        }

        // Back-compat: no explicit type saved yet — fall back to derivation.
        return $this->usesWorkerBridge() ? 'worker' : 'direct';
    }

    public function usesHostBridge(): bool
    {
        return $this->bridgeType() === 'host';
    }

    /** Base64-encoded 32-byte key used for AES-256-GCM body encryption with the host app. */
    public function hostEncryptionKey(): ?string
    {
        $stored = trim((string) ($this->stored()['host_encryption_key'] ?? ''));

        return $stored !== '' ? $stored : null;
    }

    /** HMAC-SHA256 secret used to sign/verify host <-> backend sync requests. */
    public function hostSyncSecret(): ?string
    {
        $stored = trim((string) ($this->stored()['host_sync_secret'] ?? ''));

        return $stored !== '' ? $stored : null;
    }

    public function webhookBaseUrl(): string
    {
        if ($this->usesWorkerBridge()) {
            return $this->panelBaseUrl();
        }

        return $this->backendOrigin();
    }

    /** Outbound Bot API — through Worker/host relay when bridge is on (Iran-safe). */
    public function telegramApiBaseUrl(): string
    {
        if ($this->usesWorkerBridge()) {
            return $this->panelBaseUrl();
        }

        if ($this->usesHostBridge()) {
            $relay = trim((string) config('telegram_bot.host_api_proxy_url', ''));
            if ($relay !== '' && $this->proxySharedToken() !== null) {
                return $relay;
            }
        }

        $env = trim((string) config('telegram_bot.api_base_url', ''));

        return $env !== '' ? rtrim($env, '/') : self::DEFAULT_BASE_URL;
    }

    /**
     * Bearer token for outbound Bot API calls when relayed through Worker or
     * the host's dumb Bot-API relay — both use a shared-secret Bearer header
     * (`PROXY_SHARED_TOKEN`), distinct from the `telegram/` host app's own
     * HMAC-signed sync bridge (used only for webhook + local menu state).
     */
    public function telegramApiProxyBearerToken(): ?string
    {
        if ($this->usesWorkerBridge() || $this->usesHostBridge()) {
            return $this->proxySharedToken();
        }

        return null;
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
        if ($this->usesHostBridge()) {
            return $this->hostWebhookUrl();
        }

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

    /** Absolute path to the standalone `telegram/` host app directory. */
    public function hostAppRoot(): string
    {
        $fromEnv = trim((string) env('TELEGRAM_HOST_APP_PATH', ''));
        if ($fromEnv !== '' && is_dir($fromEnv)) {
            return rtrim($fromEnv, '/\\');
        }

        // Standard layout: foroushino/bahram-cm/backend + foroushino/telegram (same repo).
        $inRepo = dirname(base_path(), 2).DIRECTORY_SEPARATOR.'telegram';
        if (is_dir($inRepo)) {
            return $inRepo;
        }

        // Split deploy: /var/www/bahram-cm/backend + /var/www/foroushino/telegram
        $sibling = dirname(base_path(), 2).DIRECTORY_SEPARATOR.'foroushino'.DIRECTORY_SEPARATOR.'telegram';
        if (is_dir($sibling)) {
            return $sibling;
        }

        return dirname(base_path()).DIRECTORY_SEPARATOR.'telegram';
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
            'worker_url' => in_array($this->bridgeType(), ['worker', 'host'], true)
                ? $this->panelBaseUrl()
                : $this->workerUrl(),
            'mode' => $this->bridgeType(),
            'backend_origin' => $this->backendOrigin(),
            'telegram_api_base_url' => $this->telegramApiBaseUrl(),
            'server_webhook_url' => $this->buildServerWebhookUrl('production'),
            'worker_webhook_url' => $this->usesWorkerBridge() || $this->usesHostBridge()
                ? $this->buildWebhookUrl('production')
                : null,
            'host_app_base_url' => $this->usesHostBridge() ? $this->hostAppBaseUrl() : null,
            'host_webhook_url' => $this->usesHostBridge() ? $this->hostWebhookUrl() : null,
            'host_push_url' => $this->usesHostBridge() ? $this->hostPushUrl() : null,
            'has_connection_token' => $connectionToken !== null,
            'connection_token_preview' => $connectionToken ? $this->maskSecret($connectionToken) : null,
            'configured' => $this->isConfigured(),
            'worker_sample_template' => $this->workerSampleTemplate(),
            'worker_deploy_sample' => $this->buildWorkerDeploySample(),
            'host_proxy_deploy_sample' => $this->buildHostProxyDeploySample(),
            'host_proxy_htaccess_sample' => $this->buildHostProxyHtaccessSample(),
            'bridge_type' => $this->bridgeType(),
            'has_host_secrets' => $this->hostSyncSecret() !== null && $this->hostEncryptionKey() !== null,
            'host_sync_secret_preview' => $this->hostSyncSecret() ? $this->maskSecret($this->hostSyncSecret()) : null,
            'host_encryption_key_preview' => $this->hostEncryptionKey() ? $this->maskSecret($this->hostEncryptionKey()) : null,
            'host_sync_base_url' => $this->backendOrigin().'/api/v1/integrations/telegram-host',
            'host_config_sample' => $this->buildHostAppConfigSample(),
        ];
    }

    /** Rendered `config.php` for the standalone `telegram/` host app (deploy/host-app/config.sample.php). */
    public function buildHostAppConfigSample(): ?string
    {
        $path = $this->hostAppRoot().DIRECTORY_SEPARATOR.'config.sample.php';
        if (! is_file($path)) {
            return null;
        }

        $template = file_get_contents($path);
        if (! is_string($template) || $template === '') {
            return null;
        }

        $bot = TelegramBot::query()->where('key', 'production')->first();

        return str_replace(
            [
                '__SYNC_BASE_URL__',
                '__HMAC_SECRET__',
                '__AES_KEY__',
                '__WEBHOOK_SECRET__',
                '__BOT_TOKEN__',
                '__DB_HOST__',
                '__DB_DATABASE__',
                '__DB_USERNAME__',
                '__DB_PASSWORD__',
                '__HOST_PUBLIC_URL__',
            ],
            [
                $this->backendOrigin().'/api/v1/integrations/telegram-host',
                (string) ($this->hostSyncSecret() ?? ''),
                (string) ($this->hostEncryptionKey() ?? ''),
                (string) ($this->webhookSecret() ?? ''),
                (string) ($bot?->resolveToken() ?? ''),
                '127.0.0.1',
                'CHANGE_ME',
                'CHANGE_ME',
                'CHANGE_ME',
                $this->usesHostBridge() ? $this->hostAppBaseUrl() : 'https://YOUR-HOST-DOMAIN',
            ],
            $template,
        );
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
            $next['bridge_type'] = 'direct';
        } elseif (array_key_exists('base_url', $input) || array_key_exists('worker_url', $input)) {
            $raw = trim((string) ($input['worker_url'] ?? $input['base_url'] ?? ''));
            if ($raw === '') {
                if ($mode === 'worker' || $mode === 'host') {
                    throw new \InvalidArgumentException('برای این حالت، آدرس را وارد کنید.');
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

        if (in_array($mode, ['worker', 'host'], true)) {
            $next['bridge_type'] = $mode;
        }

        // Single active bridge only — drop any leftover dual-proxy setting.
        unset($next['secondary_base_url']);

        if ($mode === 'host') {
            if (trim((string) ($next['host_sync_secret'] ?? '')) === '') {
                $next['host_sync_secret'] = Str::random(64);
            }
            if (trim((string) ($next['host_encryption_key'] ?? '')) === '') {
                $next['host_encryption_key'] = AesGcmCipher::generateKey();
            }
        }

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

        if (($next['bridge_type'] ?? '') === 'host') {
            PushTelegramHostSyncJob::all();
        }

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
            if ($this->usesHostBridge()) {
                $hostResult = app(TelegramHostPushService::class)->registerWebhook($url, $secret);
                if (! ($hostResult['ok'] ?? false)) {
                    $error = (string) ($hostResult['error'] ?? 'host_error');

                    return [
                        'ok' => false,
                        'message' => 'ثبت وب‌هوک ناموفق: '.$error
                            .' — هاست: '.$this->hostWebhookUrl()
                            .' (سرور ایران به api.telegram.org دسترسی ندارد؛ از هاست خارج ثبت می‌شود)',
                    ];
                }
                $url = (string) ($hostResult['url'] ?? $url);
            } else {
                $clients->forBot($bot)->setWebhook($url, $secret);
            }
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => $this->formatWebhookRegistrationError($e)];
        }

        $mode = $this->usesHostBridge()
            ? 'هاست خارج'
            : ($this->usesWorkerBridge() ? 'Cloudflare Worker' : 'مستقیم');
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

        if ($this->usesHostBridge()) {
            if ($this->isLikelyTelegramConnectivityFailure($e)) {
                return $base.$detail
                    .' — api.telegram.org از سرور ایران در دسترس نیست؛ وب‌هوک را دستی ثبت کنید.'
                    .' لاگ: storage/logs/telegram.log';
            }

            return $base.$detail.' — هاست: '.$this->hostWebhookUrl();
        }

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
