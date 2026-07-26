<?php

namespace App\Services;

use App\Enums\OtpPurpose;
use App\Models\User;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramConversation;
use App\Modules\TelegramBot\Models\TelegramLegalDocument;
use App\Modules\TelegramBot\Models\TelegramTermsAcceptance;
use App\Modules\TelegramBot\Services\AccountLinkService;
use App\Modules\TelegramBot\Services\BotMessageCatalog;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\DisplayNameValidator;
use App\Modules\TelegramBot\Services\IranMobileNormalizer;
use App\Modules\TelegramBot\Services\RegistrationKeyboard;
use App\Modules\TelegramBot\Services\TelegramAdminUserStatsService;
use App\Modules\TelegramBot\Services\TelegramUserSyncService;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Services\Exceptions\OtpException;
use App\Services\OtpService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Registration for the external Telegram host — Iran DB only, no Telegram API calls.
 */
class TelegramHostRegistrationService
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly AccountLinkService $accountLinks,
        private readonly BotMessageCatalog $messages,
        private readonly RegistrationKeyboard $registrationKeyboard,
        private readonly IranMobileNormalizer $mobileNormalizer,
        private readonly DisplayNameValidator $displayNameValidator,
        private readonly TelegramUserSyncService $userSync,
        private readonly TelegramAdminUserStatsService $adminUserStats,
        private readonly OtpService $otp,
        private readonly TelegramHostAccountSnapshotService $snapshots,
    ) {}

    /**
     * @param  array<string, mixed>  $from
     * @return array<string, mixed>
     */
    public function start(TelegramBot $bot, int $telegramUserId, array $from = [], ?string $startPayload = null): array
    {
        $account = $this->accountLinks->findOrCreateAccount(
            $bot,
            $telegramUserId,
            firstName: trim((string) ($from['first_name'] ?? '')) ?: null,
            lastName: trim((string) ($from['last_name'] ?? '')) ?: null,
        );
        $conversation = $this->conversations->forAccount($account);

        if ($startPayload !== null && $startPayload !== '') {
            $this->conversations->mergeContext($conversation, ['start_payload' => $startPayload]);
            $conversation->refresh();
        }

        if ($account->isBotAdmin()) {
            $this->conversations->transition($conversation, ConversationState::Idle);

            return $this->verifiedMenu($bot, $account);
        }

        if ($account->isLinked() && $account->hasVerifiedMobile()) {
            return $this->verifiedMenu($bot, $account->fresh());
        }

        if (! $bot->featureEnabled(BotFeatureFlag::CollectPhoneAndName)) {
            $this->conversations->transition($conversation, ConversationState::Idle);

            return $this->ok([
                $this->reply('خوش آمدید! دریافت شماره و نام فعلاً غیرفعال است.', [
                    'show_main_menu' => true,
                ]),
            ], $conversation, $account);
        }

        $activeTerms = TelegramLegalDocument::query()
            ->where('key', 'terms_of_service')
            ->where('is_active', true)
            ->orderByDesc('effective_at')
            ->first();

        if ($activeTerms === null) {
            return $this->askPhone($bot, $account, $conversation);
        }

        $alreadyAccepted = TelegramTermsAcceptance::query()
            ->where('telegram_account_id', $account->id)
            ->where('telegram_legal_document_id', $activeTerms->id)
            ->exists();

        if ($alreadyAccepted) {
            return $this->askPhone($bot, $account, $conversation);
        }

        $this->conversations->transition($conversation, ConversationState::WaitingForTerms, [
            'legal_document_id' => $activeTerms->id,
        ]);

        $text = TelegramHtml::bold('قوانین و مقررات')."\n\n"
            .($activeTerms->content ?? 'لطفاً قوانین را مطالعه و تایید کنید.');

        return $this->ok([
            $this->reply($text, [
                'parse_mode' => 'HTML',
                'reply_markup' => [
                    'inline_keyboard' => [[
                        ['text' => '✅ می‌پذیرم', 'callback_data' => 'reg:accept_terms', 'style' => 'success'],
                        ['text' => '❌ انصراف', 'callback_data' => 'reg:cancel', 'style' => 'danger'],
                    ]],
                ],
            ]),
        ], $conversation, $account);
    }

    /**
     * @return array<string, mixed>
     */
    public function shareContact(TelegramBot $bot, int $telegramUserId, string $phone, int $contactUserId): array
    {
        $account = $this->accountLinks->findOrCreateAccount($bot, $telegramUserId);
        $conversation = $this->conversations->forAccount($account);

        if ($account->isLinked() && $account->hasVerifiedMobile()) {
            return $this->verifiedMenu($bot, $account->fresh());
        }

        if ($contactUserId <= 0 || $contactUserId !== $telegramUserId) {
            return $this->ok([
                $this->reply('لطفاً فقط شماره تماس خودتان را با دکمه «ارسال شماره تماس» بفرستید.', [
                    'reply_markup' => $this->registrationKeyboard->requestContactMarkup(withBack: false),
                ]),
            ], $conversation, $account);
        }

        if (trim($phone) === '') {
            return $this->ok([
                $this->reply('شماره تماس دریافت نشد. دوباره تلاش کنید.', [
                    'reply_markup' => $this->registrationKeyboard->requestContactMarkup(withBack: false),
                ]),
            ], $conversation, $account);
        }

        return $this->processPhone($bot, $account, $conversation, $phone, fromContact: true);
    }

    /**
     * @return array<string, mixed>
     */
    public function submitName(TelegramBot $bot, int $telegramUserId, string $name): array
    {
        $account = $this->accountLinks->findOrCreateAccount($bot, $telegramUserId);
        $conversation = $this->conversations->forAccount($account);

        if ($conversation->state !== ConversationState::WaitingForName) {
            return $this->ok([], $conversation, $account);
        }

        if (! $this->displayNameValidator->validate($name)) {
            return $this->ok([
                $this->reply('نام وارد شده معتبر نیست. لطفاً فقط حروف فارسی یا انگلیسی وارد کنید (۲ تا ۶۰ کاراکتر).'),
            ], $conversation, $account);
        }

        $normalizedName = $this->displayNameValidator->normalize($name);
        $mobile = (string) ($account->mobile ?: data_get($conversation->context, 'mobile', ''));
        $normalizedMobile = $this->mobileNormalizer->normalize(
            $mobile,
            $bot->featureEnabled(BotFeatureFlag::IranMobileOnly),
        );

        if ($normalizedMobile === null) {
            return $this->askPhone($bot, $account, $conversation, 'ابتدا شماره موبایل را ارسال کنید:');
        }

        $account->update(['display_name' => $normalizedName, 'mobile' => $normalizedMobile]);

        return $this->completeRegistration($bot, $account->fresh(), $conversation);
    }

    /**
     * @return array<string, mixed>
     */
    public function regCallback(TelegramBot $bot, int $telegramUserId, string $data): array
    {
        $account = $this->accountLinks->findOrCreateAccount($bot, $telegramUserId);
        $conversation = $this->conversations->forAccount($account);

        if ($data === 'reg:accept_terms' && $conversation->state === ConversationState::WaitingForTerms) {
            $documentId = (int) data_get($conversation->context, 'legal_document_id');
            if ($documentId > 0) {
                TelegramTermsAcceptance::query()->firstOrCreate(
                    [
                        'telegram_account_id' => $account->id,
                        'telegram_legal_document_id' => $documentId,
                    ],
                    ['accepted_at' => now()],
                );
            }

            return $this->askPhone($bot, $account, $conversation);
        }

        if ($data === 'reg:cancel') {
            $this->conversations->reset($conversation);
            $conversation->refresh();

            return $this->ok([
                $this->reply('فرآیند ثبت‌نام لغو شد.', ['remove_keyboard' => true]),
            ], $conversation, $account);
        }

        return $this->ok([], $conversation, $account);
    }

    /**
     * @return array<string, mixed>
     */
    private function processPhone(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        string $rawPhone,
        bool $fromContact,
    ): array {
        $mobile = $this->mobileNormalizer->normalize(
            $rawPhone,
            $bot->featureEnabled(BotFeatureFlag::IranMobileOnly),
        );

        if ($mobile === null) {
            $msg = $bot->featureEnabled(BotFeatureFlag::IranMobileOnly)
                ? 'شماره تماس معتبر نیست. فقط موبایل ایران (09…) پذیرفته می‌شود.'
                : 'شماره تماس معتبر نیست. دوباره تلاش کنید.';

            return $this->ok([
                $this->reply($msg, [
                    'reply_markup' => $this->registrationKeyboard->requestContactMarkup(withBack: false),
                ]),
            ], $conversation, $account);
        }

        $account->update(['mobile' => $mobile]);

        if ($bot->featureEnabled(BotFeatureFlag::SmsOtpVerification)) {
            try {
                $this->otp->send($mobile, OtpPurpose::TelegramLink);
            } catch (OtpException $e) {
                return $this->ok([
                    $this->reply('ارسال پیامک ناموفق بود: '.$e->getMessage()),
                ], $conversation, $account);
            }

            $this->conversations->transition($conversation, ConversationState::WaitingForOtp, [
                'mobile' => $mobile,
                'from_contact' => $fromContact,
            ]);

            return $this->ok([
                $this->reply('کد تایید پیامک‌شده را وارد کنید.', [
                    'reply_markup' => $this->registrationKeyboard->nameStepMarkup(),
                ]),
            ], $conversation, $account);
        }

        return $this->continueAfterPhoneVerified($bot, $account, $conversation, $mobile);
    }

    /**
     * @return array<string, mixed>
     */
    private function continueAfterPhoneVerified(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        string $mobile,
    ): array {
        $existing = User::query()->where('mobile', $mobile)->first();
        $knownName = filled($existing?->name) ? trim((string) $existing->name) : '';

        if ($knownName !== '') {
            $account->update(['display_name' => $knownName, 'mobile' => $mobile]);

            return $this->completeRegistration($bot, $account->fresh(), $conversation, [
                $this->reply(
                    'سلام '.TelegramHtml::escape($knownName)."!\nشماره شما در سیستم پیدا شد.",
                    ['parse_mode' => 'HTML', 'remove_keyboard' => true],
                ),
            ]);
        }

        $this->conversations->transition($conversation, ConversationState::WaitingForName, [
            'mobile' => $mobile,
        ]);

        return $this->ok([
            $this->reply($this->messages->get($bot, 'registration_ask_name'), [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->registrationKeyboard->nameStepMarkup(),
            ]),
        ], $conversation, $account);
    }

    /**
     * @param  list<array<string, mixed>>  $prefixReplies
     * @return array<string, mixed>
     */
    private function completeRegistration(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        array $prefixReplies = [],
    ): array {
        $summaryLines = [];

        try {
            DB::transaction(function () use ($bot, $account, $conversation, &$summaryLines): void {
                if ($bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
                    $this->adminUserStats->attributeReferralFromStartPayload(
                        $account,
                        data_get($conversation->context, 'start_payload'),
                    );
                }

                $account->update(['mobile_verified_at' => now()]);

                $sync = $this->userSync->syncAfterMobileVerification($account->fresh());
                $this->accountLinks->linkToUser($account->fresh(), $sync['user']);
                $summaryLines = $sync['lines'];
                $this->conversations->transition($conversation, ConversationState::Idle);
            });
        } catch (\Throwable $e) {
            Log::channel('telegram')->error('telegram.host.registration_link_failed', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);

            return $this->ok(array_merge($prefixReplies, [
                $this->reply('ثبت‌نام انجام شد ولی اتصال به حساب سایت با خطا مواجه شد. پشتیبانی را مطلع کنید.'),
            ]), $conversation, $account);
        }

        $account->refresh();
        if ($bot->key === 'production') {
            app(TelegramHostAccountSync::class)->queuePush($account);
        }

        $conversation->refresh();

        $replies = $prefixReplies;
        $replies[] = $this->reply($this->messages->get($bot, 'main_menu_hint'), [
            'parse_mode' => 'HTML',
            'show_main_menu' => true,
        ]);

        $body = $this->messages->get($bot, 'registration_complete');
        if ($summaryLines !== []) {
            $body .= "\n\n".implode("\n", array_map(
                static fn ($line) => TelegramHtml::escape((string) $line),
                $summaryLines,
            ));
        }
        $replies[] = $this->reply($body, ['parse_mode' => 'HTML']);

        return $this->ok($replies, $conversation, $account, includeAccount: true);
    }

    /**
     * @return array<string, mixed>
     */
    private function askPhone(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        ?string $message = null,
    ): array {
        $this->conversations->transition($conversation, ConversationState::WaitingForMobile);

        $base = $message ?? $this->messages->get($bot, 'registration_ask_mobile');
        $hint = "\n\n".'⚠️ تایپ شماره پذیرفته نمی‌شود — فقط دکمه پایین.';
        if ($bot->featureEnabled(BotFeatureFlag::IranMobileOnly)) {
            $hint .= "\n".'✅ فقط شماره موبایل ایران پذیرفته می‌شود.';
        }

        return $this->ok([
            $this->reply($base.$hint, [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->registrationKeyboard->requestContactMarkup(withBack: false),
            ]),
        ], $conversation, $account);
    }

    /**
     * @return array<string, mixed>
     */
    private function verifiedMenu(TelegramBot $bot, TelegramAccount $account): array
    {
        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::Idle);

        return $this->ok([
            $this->reply($this->messages->get($bot, 'main_menu_hint'), [
                'parse_mode' => 'HTML',
                'show_main_menu' => true,
            ]),
        ], $conversation, $account, includeAccount: true);
    }

    /**
     * @param  list<array<string, mixed>>  $replies
     * @return array<string, mixed>
     */
    private function ok(
        array $replies,
        TelegramConversation $conversation,
        TelegramAccount $account,
        bool $includeAccount = false,
    ): array {
        $conversation->refresh();

        $payload = [
            'ok' => true,
            'conversation' => [
                'state' => $conversation->state->value,
                'context' => is_array($conversation->context) ? $conversation->context : [],
            ],
            'replies' => $replies,
        ];

        if ($includeAccount || ($account->hasVerifiedMobile() && $account->mobile_verified_at !== null)) {
            $payload['account'] = $this->briefAccountPayload($account->fresh(['user', 'bot']));
        }

        return $payload;
    }

    /** @return array<string, mixed> */
    private function briefAccountPayload(TelegramAccount $account): array
    {
        return [
            'telegram_user_id' => (int) $account->telegram_user_id,
            'user_id' => $account->user_id,
            'mobile' => $account->mobile,
            'mobile_verified_at' => $account->mobile_verified_at?->toIso8601String(),
            'display_name' => $account->display_name,
            'is_bot_admin' => (bool) $account->is_bot_admin,
        ];
    }

    /** @param  array<string, mixed>  $options */
    private function reply(string $text, array $options = []): array
    {
        return array_merge(['text' => $text], $options);
    }
}
