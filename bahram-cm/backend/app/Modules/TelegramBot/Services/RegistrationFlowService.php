<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\OtpPurpose;
use App\Models\User;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramConversation;
use App\Modules\TelegramBot\Models\TelegramLegalDocument;
use App\Modules\TelegramBot\Models\TelegramTermsAcceptance;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Services\Exceptions\OtpException;
use App\Services\OtpService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegistrationFlowService
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly DisplayNameValidator $displayNameValidator,
        private readonly IranMobileNormalizer $mobileNormalizer,
        private readonly AccountLinkService $accountLinks,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly RegistrationKeyboard $registrationKeyboard,
        private readonly TelegramUserSyncService $userSync,
        private readonly TelegramAdminUserStatsService $adminUserStats,
        private readonly OtpService $otp,
        private readonly TelegramOutboundMessenger $outbound,
        private readonly BotMessageCatalog $messages,
    ) {}

    public function start(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation): void
    {
        if ($account->isBotAdmin()) {
            $this->conversations->transition($conversation, ConversationState::Idle);
            $this->sendMainMenu($bot, $account);

            return;
        }

        if ($account->isLinked() && $account->hasVerifiedMobile()) {
            $this->sendMainMenu($bot, $account);

            return;
        }

        if (! $bot->featureEnabled(BotFeatureFlag::CollectPhoneAndName)) {
            $this->conversations->transition($conversation, ConversationState::Idle);
            $name = trim(($account->first_name ?? '').' '.($account->last_name ?? '')) ?: 'کاربر';
            if (blank($account->display_name)) {
                $account->update(['display_name' => $name]);
            }
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'خوش آمدید! دریافت شماره و نام فعلاً غیرفعال است.',
                ['reply_markup' => $this->mainMenu->replyMarkup($account, $bot)],
            );

            return;
        }

        $activeTerms = TelegramLegalDocument::query()
            ->where('key', 'terms_of_service')
            ->where('is_active', true)
            ->orderByDesc('effective_at')
            ->first();

        if ($activeTerms === null) {
            $this->askForPhone($bot, $account, $conversation);

            return;
        }

        $alreadyAccepted = TelegramTermsAcceptance::query()
            ->where('telegram_account_id', $account->id)
            ->where('telegram_legal_document_id', $activeTerms->id)
            ->exists();

        if ($alreadyAccepted) {
            $this->askForPhone($bot, $account, $conversation);

            return;
        }

        $this->conversations->transition($conversation, ConversationState::WaitingForTerms, [
            'legal_document_id' => $activeTerms->id,
        ]);

        $text = TelegramHtml::bold('قوانین و مقررات')."\n\n"
            .($activeTerms->content ?? 'لطفاً قوانین را مطالعه و تایید کنید.');

        $this->queueMessage($bot, $account->telegram_user_id, $text, [
            'parse_mode' => 'HTML',
            'reply_markup' => [
                'inline_keyboard' => [[
                    ['text' => '✅ می‌پذیرم', 'callback_data' => 'reg:accept_terms', 'style' => 'success'],
                    ['text' => '❌ انصراف', 'callback_data' => 'reg:cancel', 'style' => 'danger'],
                ]],
            ],
        ]);
    }

    public function handleCallback(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $data): void
    {
        if ($data === 'reg:accept_terms' && $conversation->state === ConversationState::WaitingForTerms) {
            $this->acceptTerms($account, $conversation);
            $this->askForPhone($bot, $account, $conversation);

            return;
        }

        if ($data === 'reg:cancel') {
            $this->conversations->reset($conversation);
            $this->queueMessage($bot, $account->telegram_user_id, 'فرآیند ثبت‌نام لغو شد.', [
                'reply_markup' => $this->mainMenu->remove(),
            ]);
        }
    }

    public function handleText(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        if ($this->registrationKeyboard->isBackLabel($text)) {
            if (in_array($conversation->state, [
                ConversationState::WaitingForName,
                ConversationState::WaitingForMobile,
                ConversationState::ConfirmingRegistration,
                ConversationState::WaitingForOtp,
            ], true)) {
                $this->askForPhone($bot, $account, $conversation, 'باشه. شماره موبایل را دوباره ارسال کنید:');

                return;
            }
        }

        match ($conversation->state) {
            ConversationState::WaitingForName => $this->handleName($bot, $account, $conversation, $text),
            ConversationState::WaitingForMobile => $this->handleTypedMobile($bot, $account, $conversation, $text),
            ConversationState::WaitingForOtp => $this->handleOtp($bot, $account, $conversation, $text),
            default => null,
        };
    }

    /** @param  array<string, mixed>  $message */
    public function handleContact(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, array $message): void
    {
        if ($conversation->state !== ConversationState::WaitingForMobile) {
            $this->queueMessage($bot, $account->telegram_user_id, 'در این مرحله نیازی به ارسال شماره تماس نیست.');

            return;
        }

        $contact = (array) ($message['contact'] ?? []);
        $from = (array) ($message['from'] ?? []);
        $telegramUserId = (int) ($from['id'] ?? 0);
        $contactUserId = (int) ($contact['user_id'] ?? 0);

        if ($contactUserId <= 0 || $contactUserId !== $telegramUserId) {
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'لطفاً فقط شماره تماس خودتان را با دکمه «ارسال شماره تماس» بفرستید.',
                ['reply_markup' => $this->phoneStepMarkup($bot)],
            );

            return;
        }

        $phone = trim((string) ($contact['phone_number'] ?? ''));
        if ($phone === '') {
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'شماره تماس دریافت نشد. دوباره تلاش کنید.',
                ['reply_markup' => $this->phoneStepMarkup($bot)],
            );

            return;
        }

        $this->handleVerifiedContact($bot, $account, $conversation, $phone, fromContact: true);
    }

    private function askForPhone(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        ?string $message = null,
    ): void {
        $this->conversations->transition($conversation, ConversationState::WaitingForMobile);

        $base = $message ?? $this->messages->get($bot, 'registration_ask_mobile');
        $hint = $bot->featureEnabled(BotFeatureFlag::NumericPhoneVerification)
            ? "\n\nمی‌توانید شماره را تایپ کنید یا با دکمه زیر به‌اشتراک بگذارید."
            : "\n\nلطفاً از دکمه «ارسال شماره تماس» استفاده کنید.";

        if ($bot->featureEnabled(BotFeatureFlag::IranMobileOnly)) {
            $hint .= "\nفقط شماره ایران (09…) پذیرفته می‌شود.";
        }

        $this->queueMessage($bot, $account->telegram_user_id, $base.$hint, [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->phoneStepMarkup($bot),
        ]);
    }

    private function handleTypedMobile(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        string $text,
    ): void {
        if (! $bot->featureEnabled(BotFeatureFlag::NumericPhoneVerification)) {
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'لطفاً فقط از دکمه «ارسال شماره تماس» استفاده کنید.',
                ['reply_markup' => $this->phoneStepMarkup($bot)],
            );

            return;
        }

        $this->handleVerifiedContact($bot, $account, $conversation, $text, fromContact: false);
    }

    private function handleName(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        if (! $this->displayNameValidator->validate($text)) {
            $this->queueMessage($bot, $account->telegram_user_id, 'نام وارد شده معتبر نیست. لطفاً فقط حروف فارسی یا انگلیسی وارد کنید (۲ تا ۶۰ کاراکتر).');

            return;
        }

        $name = $this->displayNameValidator->normalize($text);
        $mobile = (string) ($account->mobile ?: data_get($conversation->context, 'mobile', ''));
        $normalized = $this->mobileNormalizer->normalize(
            $mobile,
            $bot->featureEnabled(BotFeatureFlag::IranMobileOnly),
        );

        if ($normalized === null) {
            $this->askForPhone($bot, $account, $conversation, 'ابتدا شماره موبایل را ارسال کنید:');

            return;
        }

        $account->update(['display_name' => $name, 'mobile' => $normalized]);
        $this->completeRegistration($bot, $account->fresh(), $conversation);
    }

    private function handleOtp(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        string $text,
    ): void {
        $mobile = (string) data_get($conversation->context, 'mobile', $account->mobile ?? '');
        $code = preg_replace('/\D/u', '', $text) ?? '';

        try {
            $this->otp->verify($mobile, $code, OtpPurpose::TelegramLink);
        } catch (OtpException $e) {
            $this->queueMessage($bot, $account->telegram_user_id, $e->getMessage());

            return;
        }

        $this->continueAfterPhoneVerified($bot, $account, $conversation, $mobile);
    }

    private function handleVerifiedContact(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        string $text,
        bool $fromContact,
    ): void {
        $mobile = $this->mobileNormalizer->normalize(
            $text,
            $bot->featureEnabled(BotFeatureFlag::IranMobileOnly),
        );

        if ($mobile === null) {
            $msg = $bot->featureEnabled(BotFeatureFlag::IranMobileOnly)
                ? 'شماره تماس معتبر نیست. فقط موبایل ایران (09…) پذیرفته می‌شود.'
                : 'شماره تماس معتبر نیست. دوباره تلاش کنید.';
            $this->queueMessage($bot, $account->telegram_user_id, $msg, [
                'reply_markup' => $this->phoneStepMarkup($bot),
            ]);

            return;
        }

        $account->update(['mobile' => $mobile]);

        if ($bot->featureEnabled(BotFeatureFlag::SmsOtpVerification)) {
            try {
                $this->otp->send($mobile, OtpPurpose::TelegramLink);
            } catch (OtpException $e) {
                $this->queueMessage($bot, $account->telegram_user_id, 'ارسال پیامک ناموفق بود: '.$e->getMessage());

                return;
            }

            $this->conversations->transition($conversation, ConversationState::WaitingForOtp, [
                'mobile' => $mobile,
                'from_contact' => $fromContact,
            ]);
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'کد تایید پیامک‌شده را وارد کنید.',
                ['reply_markup' => $this->registrationKeyboard->nameStepMarkup()],
            );

            return;
        }

        // Contact share without SMS = verified. Typed number without SMS = accepted when numeric mode is on.
        $this->continueAfterPhoneVerified($bot, $account, $conversation, $mobile);
    }

    private function continueAfterPhoneVerified(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        string $mobile,
    ): void {
        $existing = User::query()->where('mobile', $mobile)->first();
        $knownName = filled($existing?->name) ? trim((string) $existing->name) : '';

        if ($knownName !== '') {
            $account->update(['display_name' => $knownName, 'mobile' => $mobile]);
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'سلام '.TelegramHtml::escape($knownName)."!\nشماره شما در سیستم پیدا شد.",
                [
                    'parse_mode' => 'HTML',
                    'reply_markup' => $this->mainMenu->remove(),
                ],
            );
            $this->completeRegistration($bot, $account->fresh(), $conversation);

            return;
        }

        $this->conversations->transition($conversation, ConversationState::WaitingForName, [
            'mobile' => $mobile,
        ]);
        $this->queueMessage(
            $bot,
            $account->telegram_user_id,
            $this->messages->get($bot, 'registration_ask_name'),
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->registrationKeyboard->nameStepMarkup(),
            ],
        );
    }

    private function completeRegistration(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
    ): void {
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
            Log::channel('telegram')->error('Telegram registration link failed.', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);
            $this->queueMessage($bot, $account->telegram_user_id, 'ثبت‌نام انجام شد ولی اتصال به حساب سایت با خطا مواجه شد. پشتیبانی را مطلع کنید.');

            return;
        }

        $account->refresh();
        $this->sendMainMenu($bot, $account->fresh());

        $body = $this->messages->get($bot, 'registration_complete');
        if ($summaryLines !== []) {
            $body .= "\n\n".implode("\n", array_map(
                static fn ($line) => TelegramHtml::escape((string) $line),
                $summaryLines,
            ));
        }
        $this->queueMessage($bot, $account->telegram_user_id, $body, ['parse_mode' => 'HTML']);
    }

    private function acceptTerms(TelegramAccount $account, TelegramConversation $conversation): void
    {
        $documentId = (int) data_get($conversation->context, 'legal_document_id');

        if ($documentId <= 0) {
            return;
        }

        TelegramTermsAcceptance::query()->firstOrCreate(
            [
                'telegram_account_id' => $account->id,
                'telegram_legal_document_id' => $documentId,
            ],
            ['accepted_at' => now()],
        );
    }

    private function sendMainMenu(TelegramBot $bot, TelegramAccount $account): void
    {
        $sticker = $this->messages->stickerFileId($bot, 'sticker_welcome');
        if ($sticker !== null) {
            $this->outbound->replySticker($bot, $account->telegram_user_id, $sticker);
        }

        $this->queueMessage($bot, $account->telegram_user_id, $this->messages->get($bot, 'main_menu_hint'), [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
        ]);
    }

    /** @return array<string, mixed> */
    private function phoneStepMarkup(TelegramBot $bot): array
    {
        if ($bot->featureEnabled(BotFeatureFlag::NumericPhoneVerification)) {
            return [
                'keyboard' => [
                    [['text' => '📱 ارسال شماره تماس', 'request_contact' => true]],
                    [['text' => RegistrationKeyboard::BACK_LABEL]],
                ],
                'resize_keyboard' => true,
            ];
        }

        return $this->registrationKeyboard->requestContactMarkup();
    }

    /** @param  array<string, mixed>  $options */
    private function queueMessage(TelegramBot $bot, int $chatId, string $text, array $options = []): void
    {
        // Honors TELEGRAM_OUTBOUND_SYNC — /start must not depend on Horizon silently.
        $this->outbound->reply($bot, $chatId, $text, $options);
    }
}
