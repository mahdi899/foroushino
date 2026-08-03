<?php

declare(strict_types=1);

namespace TelegramHost\Http;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\PendingMobileAccess;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Db\Connection;
use TelegramHost\Http\SyncClient;
use TelegramHost\Services\WebhookRegisterFromPull;
use TelegramHost\Support\HostBridgeConfig;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Telegram\BotApiClient;

/**
 * Handles push commands from the main server (server → host).
 * Triggered via public/host-sync.php after Bearer token verification.
 */
final class InboundSyncHandler
{
    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config) {}

    /**
     * @return array{ok: bool, action?: string, error?: string, defer?: bool, payload?: array<string, mixed>}
     */
    public function handle(string $rawBody, string $origin, string $bearer): array
    {
        $payload = $this->decodePayload($rawBody, $origin, $bearer);
        if (! ($payload['ok'] ?? false)) {
            return $payload;
        }

        /** @var array<string, mixed> $body */
        $body = $payload['payload'];
        $action = (string) ($body['action'] ?? 'refresh_all');

        if ($action === 'register_webhook') {
            return array_merge($this->registerWebhook($body), ['defer' => false]);
        }

        if ($action === 'notify_user') {
            return array_merge($this->deliverNotification($body), ['defer' => false]);
        }

        if ($action === 'push_account') {
            try {
                $pdo = Connection::get($this->config);
                $stored = $this->pushAccount($pdo, $body);
            } catch (\Throwable $e) {
                error_log('[telegram-host] push_account: '.$e->getMessage());

                return [
                    'ok' => false,
                    'action' => 'push_account',
                    'error' => 'store_failed',
                    'detail' => $e->getMessage(),
                    'defer' => false,
                ];
            }
            if (! ($stored['ok'] ?? false)) {
                return array_merge($stored, ['defer' => false]);
            }

            // Ownership/cache must land BEFORE the paid notification, otherwise
            // the user can reopen «کانال مرجع» and still see the buy UI.
            $account = (array) ($body['account'] ?? []);
            $telegramUserId = (int) ($account['telegram_user_id'] ?? 0);
            $notification = (array) ($body['notification'] ?? []);
            if ($telegramUserId > 0 && $this->notificationHasContent($notification)) {
                $this->deliverNotification(array_merge(
                    ['telegram_user_id' => $telegramUserId],
                    $notification,
                ));
            }

            return ['ok' => true, 'action' => 'push_account', 'defer' => false];
        }

        // Bootstrap/catalog refreshes now carry the actual data in the push
        // itself (see App\Services\TelegramHostPayloadBuilder on Iran) — no
        // network call back to Iran is needed, so these run synchronously,
        // right here, instead of via the deferred/fastcgi_finish_request path.
        // That old path made a push into two network hops and, whenever the
        // callback timed out, produced a malformed 500 response and left the
        // host's cache stale.
        if (in_array($action, ['refresh_bootstrap', 'refresh_catalog', 'refresh_all'], true)) {
            return $this->handleRefreshSync($action, $body);
        }

        // Pre-provisioned access for a buyer who bought on the website but
        // has never started this bot — see TelegramHostAccountSync on Iran
        // and PendingMobileAccess/HostRegistrationFlow::contact() on the host.
        if ($action === 'push_mobile_access') {
            return $this->handlePushMobileAccess($body);
        }

        if ($action === 'reset_registration') {
            return $this->handleResetRegistration($body);
        }

        return [
            'ok' => false,
            'error' => 'unknown_action',
            'action' => $action,
            'defer' => false,
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: bool, action?: string, error?: string, defer: bool}
     */
    private function handleRefreshSync(string $action, array $body): array
    {
        $pdo = Connection::get($this->config);
        $sync = new SyncClient($this->config);
        $cache = new SyncCache($pdo, $sync, $this->config);

        $hasBootstrap = is_array($body['bootstrap'] ?? null);
        $hasCatalog = is_array($body['catalog'] ?? null);

        if (! $hasBootstrap && ! $hasCatalog) {
            // Push must embed data. Do not pull Iran from host-sync (blocks /
            // double-hop). Iran should re-push with payload.
            error_log('[telegram-host] refresh sync ignored — no embedded bootstrap/catalog for '.$action);

            return [
                'ok' => false,
                'error' => 'missing_embedded_payload',
                'action' => $action,
                'defer' => false,
            ];
        }

        if ($hasBootstrap) {
            $bootstrap = (array) $body['bootstrap'];
            (new WebhookRegisterFromPull($this->config))->processIfRequested($bootstrap, $sync);
            $cache->storeBootstrapOnly($bootstrap);
        }

        if ($hasCatalog) {
            $cache->storeCatalogOnly((array) $body['catalog']);
        }

        return ['ok' => true, 'action' => $action, 'defer' => false];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: bool, action: string, defer: bool}
     */
    private function handlePushMobileAccess(array $body): array
    {
        $mobile = trim((string) ($body['mobile'] ?? ''));
        if ($mobile === '') {
            return ['ok' => false, 'action' => 'push_mobile_access', 'defer' => false];
        }

        $pdo = Connection::get($this->config);
        $pending = new PendingMobileAccess($pdo);

        if (! empty($body['revoke'])) {
            $pending->delete($mobile);
            $cache = new AccountCache($pdo);
            $existing = $cache->findVerifiedByMobile($mobile);
            if ($existing !== null) {
                $telegramUserId = (int) ($existing['telegram_user_id'] ?? 0);
                if ($telegramUserId > 0) {
                    $cache->store($telegramUserId, [
                        'user_id' => null,
                        'verification_level' => 1,
                        'snapshot' => [
                            'revision' => (string) time(),
                            'owned_product_ids' => [],
                            'replace_owned_product_ids' => true,
                        ],
                    ]);
                }
            }

            return ['ok' => true, 'action' => 'push_mobile_access', 'defer' => false];
        }

        $ownedProductIds = array_values(array_map('intval', (array) ($body['owned_product_ids'] ?? [])));
        $displayName = trim((string) ($body['display_name'] ?? ''));
        $userId = isset($body['user_id']) ? (int) $body['user_id'] : null;
        $verificationLevel = isset($body['verification_level']) ? max(1, (int) $body['verification_level']) : null;
        $snapshot = is_array($body['snapshot'] ?? null) ? (array) $body['snapshot'] : null;

        $pending->store(
            $mobile,
            $ownedProductIds,
            $displayName !== '' ? $displayName : null,
            $userId,
            $verificationLevel,
            $snapshot,
        );

        return ['ok' => true, 'action' => 'push_mobile_access', 'defer' => false];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: bool, action: string, defer: bool}
     */
    private function handleResetRegistration(array $body): array
    {
        $telegramUserId = (int) ($body['telegram_user_id'] ?? 0);
        if ($telegramUserId <= 0) {
            return ['ok' => false, 'action' => 'reset_registration', 'defer' => false];
        }

        $oldMobile = trim((string) ($body['old_mobile'] ?? ''));

        $pdo = Connection::get($this->config);
        $cache = new AccountCache($pdo);
        $cache->softResetRegistration(
            $telegramUserId,
            $oldMobile !== '' ? $oldMobile : null,
        );

        $this->sendRegistrationPromptAfterReset($pdo, $telegramUserId);

        return ['ok' => true, 'action' => 'reset_registration', 'defer' => false];
    }

  /**
   * Replace main menu with the phone-share keyboard (same UX as /start registration).
   */
    private function sendRegistrationPromptAfterReset(\PDO $pdo, int $telegramUserId): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        try {
            $sync = new SyncClient($this->config);
            $messageCache = new SyncCache($pdo, $sync, $this->config);

            $resetLine = trim($messageCache->message(
                'host_reregister_done',
                'ثبت‌نام شما ریست شد.',
            ));
            $askMobile = trim($messageCache->message(
                'registration_ask_mobile',
                "📱 تأیید شماره موبایل\n\n"
                ."برای ادامه ثبت‌نام، شماره موبایل ایران خود را تأیید کنید.\n\n"
                ."👇 منوی پایین صفحه را باز کنید و روی «ارسال شماره تماس» بزنید.\n"
                ."❗️ شماره را تایپ نکنید — فقط همان دکمه.",
            ));

            $text = $resetLine !== '' ? $resetLine."\n\n".$askMobile : $askMobile;

            $api = new BotApiClient((string) ($this->config['bot_token'] ?? ''));
            $result = $api->sendMessageResult($telegramUserId, $text, [
                'parse_mode' => 'HTML',
                'reply_markup' => InlineButtons::shareContactReplyMarkup(),
            ]);

            $messageId = (int) ($result['message_id'] ?? 0);
            if ($messageId > 0) {
                $api->editMessageReplyMarkup($telegramUserId, $messageId, InlineButtons::shareContactInlineMarkup());
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] reset registration prompt: '.$e->getMessage());
        }
    }

    /** Run deferred work after HTTP response was flushed to Iran. */
    public function runDeferred(string $action, array $body): void
    {
        if ($action === 'push_account') {
            $pdo = Connection::get($this->config);
            $this->pushAccount($pdo, $body);

            return;
        }

        error_log('[telegram-host] host-sync: ignored deferred action '.$action);
    }

    /**
     * @return array{ok: bool, error?: string, payload?: array<string, mixed>}
     */
    private function decodePayload(string $rawBody, string $origin, string $bearer): array
    {
        $expectedOrigin = (string) ($this->config['server_push_origin'] ?? 'Main-Server');
        if (! hash_equals($expectedOrigin, $origin)) {
            return ['ok' => false, 'error' => 'invalid_origin'];
        }

        $token = HostBridgeConfig::syncToken($this->config);
        if ($token === '' || ! hash_equals($token, $bearer)) {
            return ['ok' => false, 'error' => 'invalid_bearer'];
        }

        if ($rawBody === '') {
            return ['ok' => false, 'error' => 'empty_body'];
        }

        $payload = json_decode($rawBody, true);

        return is_array($payload)
            ? ['ok' => true, 'payload' => $payload]
            : ['ok' => false, 'error' => 'invalid_payload'];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, action: string}
     */
    private function pushAccount(\PDO $pdo, array $payload): array
    {
        $account = (array) ($payload['account'] ?? []);
        $telegramUserId = (int) ($account['telegram_user_id'] ?? 0);
        if ($telegramUserId <= 0) {
            return ['ok' => false, 'action' => 'push_account'];
        }

        (new AccountCache($pdo))->store($telegramUserId, $account);

        return ['ok' => true, 'action' => 'push_account'];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, action: string, error?: string}
     */
    private function deliverNotification(array $payload): array
    {
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $text = $this->resolveNotificationText($payload);
        if ($telegramUserId <= 0 || $text === '') {
            return ['ok' => false, 'action' => 'notify_user', 'error' => 'invalid_payload'];
        }

        $api = new BotApiClient((string) $this->config['bot_token']);
        $options = (array) ($payload['options'] ?? []);
        if (! isset($options['parse_mode'])) {
            $options['parse_mode'] = 'HTML';
        }
        $api->sendMessage($telegramUserId, $text, $options);

        return ['ok' => true, 'action' => 'notify_user'];
    }

    /** @param array<string, mixed> $payload */
    private function resolveNotificationText(array $payload): string
    {
        $text = trim((string) ($payload['text'] ?? ''));
        if ($text !== '') {
            return $text;
        }

        $templateKey = trim((string) ($payload['template_key'] ?? ''));
        if ($templateKey === '') {
            return '';
        }

        $pdo = Connection::get($this->config);
        $cache = new SyncCache($pdo, new SyncClient($this->config), $this->config);
        $vars = (array) ($payload['template_vars'] ?? $payload['vars'] ?? []);
        $fallback = trim((string) ($payload['template_fallback'] ?? ''));

        $text = $cache->renderMessage($templateKey, $vars, $fallback);
        $appendKey = trim((string) ($payload['template_append_key'] ?? ''));
        if ($appendKey !== '') {
            $text .= $cache->renderMessage($appendKey, $vars);
        }

        return $text;
    }

    /** @param array<string, mixed> $notification */
    private function notificationHasContent(array $notification): bool
    {
        if (trim((string) ($notification['text'] ?? '')) !== '') {
            return true;
        }

        return trim((string) ($notification['template_key'] ?? '')) !== '';
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, action: string, url?: string, error?: string}
     */
    private function registerWebhook(array $payload): array
    {
        $url = trim((string) ($payload['url'] ?? ''));
        if ($url === '') {
            return ['ok' => false, 'action' => 'register_webhook', 'error' => 'url_missing'];
        }

        $secret = (string) ($payload['secret'] ?? '');
        $api = new BotApiClient((string) $this->config['bot_token']);
        $api->setWebhook($url, $secret !== '' ? $secret : null);

        return ['ok' => true, 'action' => 'register_webhook', 'url' => $url];
    }
}
