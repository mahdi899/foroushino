<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Account\PendingMobileAccess;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\SyncClient;
use TelegramHost\Queue\PendingRegistrationSync;
use TelegramHost\Support\DisplayNameSanitizer;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\MobileNormalizer;
use TelegramHost\Telegram\BotApiClient;

/**
 * Registration on the external host — UI from local cache only; Iran sync is background.
 */
final class HostRegistrationFlow
{
    public function __construct(
        private readonly SyncClient $sync,
        private readonly BotApiClient $api,
        private readonly AccountCache $accounts,
        private readonly ConversationRepository $conversations,
        private readonly MainMenu $mainMenu,
        private readonly SyncCache $cache,
        private readonly PendingRegistrationSync $registrationQueue,
        private readonly ?MembershipGate $membership = null,
        private readonly ?PendingMobileAccess $pendingMobileAccess = null,
        private readonly ?AccountSyncCoordinator $accountSync = null,
    ) {}

    /**
     * Welcome + phone keyboard from host MySQL only (no registration/start API).
     *
     * @param  array<string, mixed>  $from
     */
    public function showLocalWelcome(int $chatId, int $telegramUserId, array $from = []): void
    {
        if (! $this->cache->featureEnabled('collect_phone_and_name')) {
            $displayName = trim(((string) ($from['first_name'] ?? '')).' '.((string) ($from['last_name'] ?? '')));
            if ($displayName === '') {
                $displayName = 'کاربر';
            }
            $this->accounts->storeLocalOnlyRegistration($telegramUserId, '', $displayName);
            $this->conversations->set($telegramUserId, 'idle', []);
            if ($this->membership !== null && ! $this->membership->requireMembership($chatId, $telegramUserId)) {
                return;
            }
            $this->api->sendMessage($chatId, $this->cache->message(
                'registration_collect_phone_disabled',
                'خوش آمدید! دریافت شماره و نام فعلاً غیرفعال است.',
            ), [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);

            return;
        }

        $this->conversations->set($telegramUserId, 'waiting_for_mobile', []);

        $text = $this->cache->message(
            'registration_ask_mobile',
            "📱 تأیید شماره موبایل\n\n"
            ."برای ادامه ثبت‌نام، شماره موبایل ایران خود را تأیید کنید.\n\n"
            ."👇 منوی پایین صفحه را باز کنید و روی «ارسال شماره تماس» بزنید.\n"
            ."❗️ شماره را تایپ نکنید — فقط همان دکمه.",
        );

        $this->sendPhoneStepMessage($chatId, $text);
    }

    /** @param array<string, mixed> $extraOptions */
    private function sendPhoneStepMessage(int $chatId, string $text, array $extraOptions = []): void
    {
        $result = $this->api->sendMessageResult($chatId, $text, array_merge([
            'parse_mode' => 'HTML',
            'reply_markup' => InlineButtons::shareContactReplyMarkup(),
        ], $extraOptions));

        $messageId = (int) ($result['message_id'] ?? 0);
        if ($messageId > 0) {
            $this->api->editMessageReplyMarkup($chatId, $messageId, InlineButtons::shareContactInlineMarkup());
        }
    }

    /**
     * @param  array<string, mixed>  $from
     * @deprecated Use showLocalWelcome after account pull; Iran API only in background queue.
     */
    public function start(int $chatId, int $telegramUserId, array $from = [], ?string $startPayload = null): void
    {
        $this->showLocalWelcome($chatId, $telegramUserId);
    }

    /** @param array<string, mixed> $contact @param array<string, mixed> $from */
    public function contact(int $chatId, int $telegramUserId, array $contact, array $from = []): void
    {
        if ($this->accounts->isVerified($telegramUserId)) {
            $this->showMainMenu($chatId, $telegramUserId);

            return;
        }

        try {
            $this->handleContact($chatId, $telegramUserId, $contact, $from);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration contact: '.$e->getMessage());
            $conv = $this->conversations->get($telegramUserId);
            $phone = trim((string) ($conv['context']['mobile'] ?? ''));
            if ($phone === '') {
                $phone = MobileNormalizer::normalizeForRegistration(
                    trim((string) ($contact['phone_number'] ?? '')),
                    $this->cache->featureEnabled('iran_mobile_only'),
                ) ?? '';
            }
            if ($phone !== '' && $this->attemptOfflineContactRecovery($chatId, $telegramUserId, $phone, $from)) {
                return;
            }
            $this->conversations->set($telegramUserId, 'waiting_for_mobile', $phone !== '' ? ['mobile' => $phone] : []);
            $this->sendPhoneStepMessage($chatId, $this->cache->message(
                'registration_contact_error',
                'خطا در پردازش شماره. لطفاً دوباره روی «ارسال شماره تماس» بزنید.',
            ));
        }
    }

    public function remindPhoneShare(int $chatId, int $telegramUserId, string $text): void
    {
        if ($this->accounts->isVerified($telegramUserId)) {
            $this->showMainMenu($chatId, $telegramUserId);

            return;
        }

        $this->conversations->set($telegramUserId, 'waiting_for_mobile', []);
        $this->sendPhoneStepMessage($chatId, $this->cache->message(
            'registration_use_share_button',
            "❗️ شماره را تایپ نکنید.\n\n"
            ."منوی پایین صفحه را باز کنید و فقط روی «ارسال شماره تماس» بزنید.",
        ));
    }

    /** @param array<string, mixed> $contact @param array<string, mixed> $from */
    private function handleContact(int $chatId, int $telegramUserId, array $contact, array $from = []): void
    {
        $rawPhone = trim((string) ($contact['phone_number'] ?? ''));
        $contactUserId = (int) ($contact['user_id'] ?? 0);

        if ($contactUserId <= 0 || $contactUserId !== $telegramUserId) {
            $this->conversations->set($telegramUserId, 'waiting_for_mobile', []);
            $this->sendPhoneStepMessage($chatId, $this->cache->message(
                'registration_contact_must_be_own',
                'لطفاً فقط شماره تماس خودتان را با دکمه «ارسال شماره تماس» بفرستید.',
            ));

            return;
        }

        if ($rawPhone === '') {
            $this->conversations->set($telegramUserId, 'waiting_for_mobile', []);
            $this->sendPhoneStepMessage($chatId, $this->cache->message(
                'registration_contact_missing',
                'شماره تماس دریافت نشد. دوباره تلاش کنید.',
            ));

            return;
        }

        $iranOnly = $this->cache->featureEnabled('iran_mobile_only');
        $phone = MobileNormalizer::normalizeForRegistration($rawPhone, $iranOnly);
        if ($phone === null) {
            $this->conversations->set($telegramUserId, 'waiting_for_mobile', []);
            $rejectMessage = $iranOnly
                ? $this->cache->message(
                    'registration_iran_mobile_only',
                    'فقط شماره موبایل ایران (09…) پذیرفته می‌شود. لطفاً شماره ایران خود را با دکمه «ارسال شماره تماس» بفرستید.',
                )
                : $this->cache->message(
                    'registration_invalid_mobile',
                    'شماره تماس معتبر نیست. دوباره تلاش کنید.',
                );
            $this->sendPhoneStepMessage($chatId, $rejectMessage);

            return;
        }

        $this->reclaimLocalRowByMobile($telegramUserId, $phone);

        $pending = $this->mergePendingAccessByMobile($telegramUserId, $phone);

        $this->conversations->set($telegramUserId, 'waiting_for_mobile', ['mobile' => $phone]);

        $loading = $this->api->sendMessageResult($chatId, '⏳ در حال بررسی شماره...');
        $loadingId = (int) ($loading['message_id'] ?? 0);

        $iranResponse = $this->trySyncContactWithIran($telegramUserId, $phone, $contactUserId);

        if ($iranResponse !== null) {
            if ($loadingId > 0) {
                $this->api->deleteMessage($chatId, $loadingId);
            }
            $this->apply($chatId, $telegramUserId, $iranResponse);
            $this->pullFullAccountSnapshot($telegramUserId);

            if ($this->contactStepResolved($telegramUserId)) {
                return;
            }
        } else {
            if ($loadingId > 0) {
                $this->api->deleteMessage($chatId, $loadingId);
            }

            $this->api->sendMessage($chatId, $this->cache->message(
                'registration_iran_unreachable',
                '⏳ اتصال به سرور اصلی برقرار نشد. ثبت‌نام موقت انجام می‌شود؛ دسترسی کامل پس از همگام‌سازی فعال می‌شود.',
            ));
        }

        $legacy = $this->accounts->findVerifiedByMobile($phone);
        if ($legacy !== null) {
            $oldId = (int) ($legacy['telegram_user_id'] ?? 0);
            if ($oldId > 0 && $oldId !== $telegramUserId) {
                $this->accounts->rekeyTelegramUserId($oldId, $telegramUserId);
            }
        }

        if ($this->tryShowVerifiedLocalAccount($chatId, $telegramUserId, $phone)) {
            $this->pullFullAccountSnapshot($telegramUserId);
            $this->enqueueRegistrationSync($telegramUserId, $phone, null, $contactUserId);

            return;
        }

        $knownName = $this->resolveLocalStudentName($telegramUserId, $phone, $pending);
        if ($knownName === '') {
            $knownName = $this->telegramDisplayName($from);
        }

        $this->continueAfterPhoneCaptured($chatId, $telegramUserId, $phone, $contactUserId, $knownName !== '' ? $knownName : null, $from);
    }

    private function contactStepResolved(int $telegramUserId): bool
    {
        if ($this->accounts->isVerified($telegramUserId)) {
            return true;
        }

        $state = (string) ($this->conversations->get($telegramUserId)['state'] ?? 'idle');

        return $state !== 'waiting_for_mobile';
    }

    /** @param array<string, mixed> $from */
    private function continueAfterPhoneCaptured(
        int $chatId,
        int $telegramUserId,
        string $phone,
        int $contactUserId,
        ?string $knownName = null,
        array $from = [],
    ): void {
        if ($this->cache->featureEnabled('sms_otp_verification')) {
            if ($this->promptForOtp($chatId, $telegramUserId, $phone, $contactUserId, $knownName)) {
                return;
            }
        }

        $displayName = trim((string) ($knownName ?? ''));
        if ($displayName === '') {
            $displayName = $this->telegramDisplayName($from);
        }
        if ($displayName === '') {
            $displayName = 'دانشجو';
        }

        $this->finishLocalRegistration($chatId, $telegramUserId, $phone, $displayName);
        $this->pullFullAccountSnapshot($telegramUserId);
        $this->enqueueRegistrationSync($telegramUserId, $phone, $displayName, $contactUserId);
    }

    /** @param array<string, mixed> $from */
    private function attemptOfflineContactRecovery(int $chatId, int $telegramUserId, string $phone, array $from = []): bool
    {
        try {
            $this->reclaimLocalRowByMobile($telegramUserId, $phone);
            $pending = $this->mergePendingAccessByMobile($telegramUserId, $phone);

            if ($this->tryShowVerifiedLocalAccount($chatId, $telegramUserId, $phone)) {
                $this->pullFullAccountSnapshot($telegramUserId);
                $this->enqueueRegistrationSync($telegramUserId, $phone, null, $telegramUserId);

                return true;
            }

            $knownName = $this->resolveLocalStudentName($telegramUserId, $phone, $pending);
            if ($knownName === '') {
                $knownName = $this->telegramDisplayName($from);
            }
            if ($knownName === '') {
                $knownName = 'دانشجو';
            }

            $this->finishLocalRegistration($chatId, $telegramUserId, $phone, $knownName);
            $this->pullFullAccountSnapshot($telegramUserId);
            $this->enqueueRegistrationSync($telegramUserId, $phone, $knownName, $telegramUserId);

            return true;
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration contact recovery: '.$e->getMessage());

            return false;
        }
    }

    private function reclaimLocalRowByMobile(int $telegramUserId, string $phone): void
    {
        $legacy = $this->accounts->findVerifiedByMobile($phone);
        if ($legacy === null) {
            return;
        }

        $oldId = (int) ($legacy['telegram_user_id'] ?? 0);
        if ($oldId > 0 && $oldId !== $telegramUserId) {
            $this->accounts->rekeyTelegramUserId($oldId, $telegramUserId);
        }
    }

    private function pullFullAccountSnapshot(int $telegramUserId): void
    {
        if ($this->accountSync === null || $telegramUserId <= 0) {
            return;
        }

        try {
            $this->accountSync->ensureFresh($telegramUserId, true);
        } catch (\Throwable $e) {
            error_log('[telegram-host] post-registration account sync: '.$e->getMessage());
        }
    }

    private function promptForOtp(
        int $chatId,
        int $telegramUserId,
        string $phone,
        int $contactUserId,
        ?string $knownName = null,
    ): bool {
        try {
            $response = $this->sync->call('otp/request', ['mobile' => $phone], 3, allowRetry: false);
            if (empty($response['ok'])) {
                $this->api->sendMessage($chatId, (string) ($response['message'] ?? 'ارسال پیامک ناموفق بود. بدون کد ادامه می‌دهیم.'));

                return false;
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] otp/request: '.$e->getMessage());
            $this->api->sendMessage($chatId, 'ارسال پیامک ناموفق بود. بدون کد ادامه می‌دهیم.');

            return false;
        }

        $this->accounts->storePendingContact($telegramUserId, $phone);
        $context = [
            'mobile' => $phone,
            'contact_user_id' => $contactUserId,
        ];
        if ($knownName !== null && $knownName !== '') {
            $context['display_name'] = $knownName;
        }
        $this->conversations->set($telegramUserId, 'waiting_for_otp', $context);
        $this->api->sendMessage($chatId, $this->cache->message(
            'registration_ask_otp',
            'کد تایید پیامک‌شده را وارد کنید.',
        ), ['reply_markup' => ['remove_keyboard' => true]]);

        $this->enqueueRegistrationSync($telegramUserId, $phone, $knownName, $contactUserId);

        return true;
    }

    /** @return array<string, mixed>|null */
    private function mergePendingAccessByMobile(int $telegramUserId, string $mobile): ?array
    {
        if ($mobile === '' || $this->pendingMobileAccess === null) {
            return null;
        }

        try {
            $pending = $this->pendingMobileAccess->get($mobile);
            if ($pending !== null) {
                if (is_array($pending['snapshot'] ?? null)) {
                    $this->pendingMobileAccess->applyToAccount($this->accounts, $telegramUserId, $mobile);
                } else {
                    $this->accounts->mergeOwnedProductIds(
                        $telegramUserId,
                        $pending['owned_product_ids'],
                        $pending['display_name'],
                    );
                    $this->pendingMobileAccess->delete($mobile);
                }
            }

            return $pending;
        } catch (\Throwable $e) {
            error_log('[telegram-host] pending mobile access merge: '.$e->getMessage());

            return null;
        }
    }

    /** @param array{owned_product_ids: list<int>, display_name: ?string}|null $pending */
    private function resolveLocalStudentName(int $telegramUserId, string $mobile, ?array $pending): string
    {
        if ($pending !== null) {
            $name = trim((string) ($pending['display_name'] ?? ''));
            if ($name !== '') {
                return $name;
            }
        }

        $account = $this->accounts->get($telegramUserId);
        if ($account !== null) {
            $name = trim((string) ($account['display_name'] ?? ''));
            if ($name !== '') {
                return $name;
            }
        }

        $byMobile = $this->accounts->findVerifiedByMobile($mobile);
        if ($byMobile !== null) {
            $name = trim((string) ($byMobile['display_name'] ?? ''));
            if ($name !== '') {
                return $name;
            }
        }

        return '';
    }

    private function finishLocalRegistration(int $chatId, int $telegramUserId, string $mobile, string $displayName): void
    {
        $this->accounts->storeLocalOnlyRegistration($telegramUserId, $mobile, $displayName);
        $this->accounts->purgeDuplicateMobileRows($mobile, $telegramUserId);
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage($chatId, $this->cache->message(
            'registration_complete_offline',
            'ثبت‌نام انجام شد. می‌توانید از منو استفاده کنید.',
        ), ['reply_markup' => ['remove_keyboard' => true]]);
        $this->showMainMenu($chatId, $telegramUserId);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function trySyncContactWithIran(int $telegramUserId, string $phone, int $contactUserId): ?array
    {
        try {
            return $this->sync->call('registration/contact', [
                'telegram_user_id' => $telegramUserId,
                'phone' => $phone,
                'contact_user_id' => $contactUserId,
            ], 6, allowRetry: true);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/contact: '.$e->getMessage());

            return null;
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function trySyncNameWithIran(int $telegramUserId, string $name): ?array
    {
        try {
            return $this->sync->call('registration/name', [
                'telegram_user_id' => $telegramUserId,
                'name' => $name,
            ], 12, allowRetry: true);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/name: '.$e->getMessage());

            return null;
        }
    }

    private function tryShowVerifiedLocalAccount(int $chatId, int $telegramUserId, string $mobile): bool
    {
        $account = $this->accounts->get($telegramUserId);
        if ($account !== null
            && ! empty($account['mobile_verified_at'])
            && trim((string) ($account['mobile'] ?? '')) === $mobile) {
            $this->showMainMenu($chatId, $telegramUserId);

            return true;
        }

        return false;
    }

    private function showMainMenu(int $chatId, int $telegramUserId): void
    {
        $this->conversations->set($telegramUserId, 'idle', []);
        if ($this->membership !== null && ! $this->membership->requireMembership($chatId, $telegramUserId)) {
            return;
        }

        try {
            $this->api->sendMessage($chatId, $this->cache->message('main_menu_hint', 'منوی اصلی آکادمی بهرام'), [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration main menu: '.$e->getMessage());
        }
    }

    public function name(int $chatId, int $telegramUserId, string $name): void
    {
        $name = trim($name);
        if ($name === '') {
            return;
        }

        $sanitized = DisplayNameSanitizer::sanitize($name);
        if ($sanitized === null) {
            $this->api->sendMessage($chatId, $this->cache->message(
                'registration_invalid_name',
                'نام وارد شده معتبر نیست. لطفاً فقط حروف فارسی یا انگلیسی وارد کنید (۲ تا ۶۰ کاراکتر).',
            ));

            return;
        }
        $name = $sanitized;

        $iranResponse = $this->trySyncNameWithIran($telegramUserId, $name);
        if ($iranResponse !== null && ! empty($iranResponse['ok'])) {
            $this->apply($chatId, $telegramUserId, $iranResponse);

            return;
        }

        $conversation = $this->conversations->get($telegramUserId);
        $mobile = trim((string) ($conversation['context']['mobile'] ?? ''));
        if ($mobile === '') {
            $account = $this->accounts->get($telegramUserId);
            $mobile = trim((string) ($account['mobile'] ?? ''));
        }

        if ($this->accounts->isVerified($telegramUserId)) {
            $this->accounts->storeLocalOnlyRegistration($telegramUserId, $mobile, $name);
            $this->conversations->set($telegramUserId, 'idle', []);
            $this->showMainMenu($chatId, $telegramUserId);
        } else {
            $this->finishLocalRegistration($chatId, $telegramUserId, $mobile, $name);
        }

        $this->enqueueRegistrationSync(
            $telegramUserId,
            $mobile,
            $name,
            (int) ($conversation['context']['contact_user_id'] ?? 0),
        );
    }

    public function callback(int $chatId, int $telegramUserId, string $data): void
    {
        try {
            $response = $this->sync->call('registration/callback', [
                'telegram_user_id' => $telegramUserId,
                'callback_data' => $data,
            ]);
            $this->apply($chatId, $telegramUserId, $response);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/callback: '.$e->getMessage());
        }
    }

    public function verifyOtp(int $chatId, int $telegramUserId, string $mobile, string $code, string $displayName = ''): void
    {
        try {
            $response = $this->sync->call('otp/verify', [
                'telegram_user_id' => $telegramUserId,
                'mobile' => $mobile,
                'code' => $code,
                'display_name' => $displayName,
            ], 3, allowRetry: false);
            if (empty($response['ok'])) {
                $this->api->sendMessage($chatId, (string) ($response['message'] ?? 'کد نامعتبر است.'));

                return;
            }
            if (is_array($response['account'] ?? null)) {
                $this->accounts->store($telegramUserId, $response['account']);
            }
            $this->conversations->set($telegramUserId, 'idle', []);
            if ($this->membership !== null && ! $this->membership->requireMembership($chatId, $telegramUserId)) {
                return;
            }
            $this->api->sendMessage($chatId, $this->cache->message('main_menu_hint', 'منوی اصلی آکادمی بهرام'), [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);
            $summary = $response['summary_lines'] ?? [];
            if (is_array($summary) && $summary !== []) {
                $this->api->sendMessage($chatId, implode("\n", array_map('strval', $summary)));
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] otp/verify: '.$e->getMessage());
            $this->api->sendMessage($chatId, 'تایید کد انجام نشد. دوباره تلاش کنید.');
        }
    }

    /** @param array<string, mixed> $response */
    private function apply(int $chatId, int $telegramUserId, array $response): void
    {
        if (empty($response['ok'])) {
            $this->api->sendMessage($chatId, (string) ($response['message'] ?? 'خطا در ثبت‌نام.'));

            return;
        }

        if (is_array($response['conversation'] ?? null)) {
            $conv = $response['conversation'];
            $this->conversations->set(
                $telegramUserId,
                (string) ($conv['state'] ?? 'idle'),
                is_array($conv['context'] ?? null) ? $conv['context'] : [],
            );
        }

        if (is_array($response['account'] ?? null)) {
            $this->accounts->store($telegramUserId, $response['account']);
        }

        $replies = $response['replies'] ?? [];
        if (! is_array($replies)) {
            $replies = [];
        }

        $sentMenu = false;
        foreach ($replies as $reply) {
            if (! is_array($reply)) {
                continue;
            }
            try {
                if (! empty($reply['show_main_menu'])) {
                    $sentMenu = true;
                }
                $this->sendReply($chatId, $telegramUserId, $reply);
            } catch (\Throwable $e) {
                error_log('[telegram-host] registration reply: '.$e->getMessage());
            }
        }

        if (! $sentMenu && $this->accounts->isVerified($telegramUserId)) {
            $this->showMainMenu($chatId, $telegramUserId);

            return;
        }

        $state = (string) ($this->conversations->get($telegramUserId)['state'] ?? 'idle');
        if ($state === 'waiting_for_name') {
            $this->api->sendMessage($chatId, $this->cache->message(
                'registration_ask_name',
                'لطفاً نام و نام خانوادگی خود را به فارسی یا انگلیسی بنویسید و ارسال کنید.',
            ), ['reply_markup' => ['remove_keyboard' => true]]);

            return;
        }

        if ($state === 'waiting_for_otp') {
            $this->api->sendMessage($chatId, $this->cache->message(
                'registration_ask_otp',
                'کد تأیید پیامک‌شده را همین‌جا تایپ کنید و بفرستید.',
            ), ['reply_markup' => ['remove_keyboard' => true]]);
        }
    }

    /** @param array<string, mixed> $reply */
    private function sendReply(int $chatId, int $telegramUserId, array $reply): void
    {
        $text = (string) ($reply['text'] ?? '');
        if ($text === '') {
            return;
        }

        $options = [];
        if (isset($reply['parse_mode'])) {
            $options['parse_mode'] = (string) $reply['parse_mode'];
        }
        if (! empty($reply['remove_keyboard'])) {
            $options['reply_markup'] = ['remove_keyboard' => true];
        } elseif (! empty($reply['show_main_menu'])) {
            $options['reply_markup'] = $this->mainMenu->replyMarkup($telegramUserId);
        } elseif (isset($reply['reply_markup']) && is_array($reply['reply_markup'])) {
            $options['reply_markup'] = $reply['reply_markup'];
        }

        $inlineMarkup = isset($reply['inline_markup']) && is_array($reply['inline_markup'])
            ? $reply['inline_markup']
            : null;

        $result = $this->api->sendMessageResult($chatId, $text, $options);

        if ($inlineMarkup !== null) {
            $messageId = (int) ($result['message_id'] ?? 0);
            if ($messageId > 0) {
                $this->api->editMessageReplyMarkup($chatId, $messageId, $inlineMarkup);
            }
        }
    }

    /** @param array<string, mixed> $from */
    private function telegramDisplayName(array $from): string
    {
        $name = trim(((string) ($from['first_name'] ?? '')).' '.((string) ($from['last_name'] ?? '')));
        if ($name === '') {
            return '';
        }

        return DisplayNameSanitizer::sanitize($name) ?? '';
    }

    private function enqueueRegistrationSync(
        int $telegramUserId,
        string $phone,
        ?string $displayName,
        int $contactUserId,
    ): void {
        $payload = [
            'phone' => $phone,
            'contact_user_id' => $contactUserId,
        ];
        if ($displayName !== null && trim($displayName) !== '') {
            $payload['display_name'] = trim($displayName);
        }

        $this->registrationQueue->enqueue($telegramUserId, $payload);
    }
}
