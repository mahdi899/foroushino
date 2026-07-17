<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\User;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Jobs\SendTelegramMessageJob;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramConversation;
use App\Modules\TelegramBot\Models\TelegramLegalDocument;
use App\Modules\TelegramBot\Models\TelegramTermsAcceptance;
use App\Modules\TelegramBot\Support\TelegramHtml;
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
    ) {}

    public function start(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation): void
    {
        if ($account->isLinked() && $account->hasVerifiedMobile()) {
            $this->sendMainMenu($bot, $account);

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
                    ['text' => '✅ می‌پذیرم', 'callback_data' => 'reg:accept_terms'],
                    ['text' => '❌ انصراف', 'callback_data' => 'reg:cancel'],
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
                $this->askForPhone($bot, $account, $conversation, 'باشه. شماره موبایل را دوباره با دکمه زیر ارسال کنید:');

                return;
            }
        }

        match ($conversation->state) {
            ConversationState::WaitingForName => $this->handleName($bot, $account, $conversation, $text),
            ConversationState::WaitingForMobile => $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'لطفاً فقط از دکمه «ارسال شماره تماس» استفاده کنید تا شماره از حساب تلگرام شما ارسال شود.',
                ['reply_markup' => $this->registrationKeyboard->requestContactMarkup()],
            ),
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

        // Telegram Bot API: request_contact shares the sender's own Contact with user_id set.
        // That share is treated as mobile verification — no SMS OTP.
        if ($contactUserId <= 0 || $contactUserId !== $telegramUserId) {
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'لطفاً فقط شماره تماس خودتان را با دکمه «ارسال شماره تماس» بفرستید.',
                ['reply_markup' => $this->registrationKeyboard->requestContactMarkup()],
            );

            return;
        }

        $phone = trim((string) ($contact['phone_number'] ?? ''));
        if ($phone === '') {
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'شماره تماس دریافت نشد. دوباره با دکمه زیر تلاش کنید.',
                ['reply_markup' => $this->registrationKeyboard->requestContactMarkup()],
            );

            return;
        }

        $this->handleVerifiedContact($bot, $account, $conversation, $phone);
    }

    private function askForPhone(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        string $message = 'سلام! برای شروع، شماره موبایل خود را با دکمه زیر به‌اشتراک بگذارید.',
    ): void {
        $this->conversations->transition($conversation, ConversationState::WaitingForMobile);
        $this->queueMessage($bot, $account->telegram_user_id, $message, [
            'reply_markup' => $this->registrationKeyboard->requestContactMarkup(),
        ]);
    }

    private function handleName(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        if (! $this->displayNameValidator->validate($text)) {
            $this->queueMessage($bot, $account->telegram_user_id, 'نام وارد شده معتبر نیست. لطفاً فقط حروف فارسی یا انگلیسی وارد کنید (۲ تا ۶۰ کاراکتر).');

            return;
        }

        $name = $this->displayNameValidator->normalize($text);
        $mobile = (string) ($account->mobile ?: data_get($conversation->context, 'mobile', ''));
        $normalized = $this->mobileNormalizer->normalize($mobile);

        if ($normalized === null) {
            $this->askForPhone($bot, $account, $conversation, 'ابتدا شماره موبایل را با دکمه زیر ارسال کنید:');

            return;
        }

        $account->update(['display_name' => $name, 'mobile' => $normalized]);
        $this->completeRegistration($bot, $account->fresh(), $conversation);
    }

    private function handleVerifiedContact(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        string $text,
    ): void {
        $mobile = $this->mobileNormalizer->normalize($text);

        if ($mobile === null) {
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'شماره تماس معتبر نیست. لطفاً دوباره با دکمه «ارسال شماره تماس» بفرستید.',
                ['reply_markup' => $this->registrationKeyboard->requestContactMarkup()],
            );

            return;
        }

        $account->update(['mobile' => $mobile]);

        $existing = User::query()->where('mobile', $mobile)->first();
        $knownName = filled($existing?->name) ? trim((string) $existing->name) : '';

        if ($knownName !== '') {
            $account->update(['display_name' => $knownName]);
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
            'شماره شما تأیید شد. لطفاً نام و نام خانوادگی خود را وارد کنید.',
            ['reply_markup' => $this->registrationKeyboard->nameStepMarkup()],
        );
    }

    private function completeRegistration(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
    ): void {
        $summaryLines = [];

        try {
            DB::transaction(function () use ($account, $conversation, &$summaryLines): void {
                $this->adminUserStats->attributeReferralFromStartPayload(
                    $account,
                    data_get($conversation->context, 'start_payload'),
                );

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

        $body = "✅ ثبت‌نام با موفقیت انجام شد!\n\n".implode("\n", $summaryLines);
        $this->queueMessage($bot, $account->telegram_user_id, $body);
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
        $this->queueMessage($bot, $account->telegram_user_id, 'منوی اصلی:', [
            'reply_markup' => $this->mainMenu->replyMarkup($account),
        ]);
    }

    /** @param  array<string, mixed>  $options */
    private function queueMessage(TelegramBot $bot, int $chatId, string $text, array $options = []): void
    {
        SendTelegramMessageJob::dispatch($bot->id, $chatId, $text, $options)
            ->onQueue(config('telegram_bot.queues.replies'));
    }
}
