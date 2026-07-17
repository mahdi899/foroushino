<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Jobs\SendTelegramMessageJob;
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
    public const OTP_PURPOSE = 'telegram_link';

    public function __construct(
        private readonly ConversationService $conversations,
        private readonly DisplayNameValidator $displayNameValidator,
        private readonly IranMobileNormalizer $mobileNormalizer,
        private readonly AccountLinkService $accountLinks,
        private readonly OtpService $otp,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly RegistrationKeyboard $registrationKeyboard,
        private readonly TelegramUserSyncService $userSync,
        private readonly TelegramBotClientFactory $clientFactory,
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
            $this->conversations->transition($conversation, ConversationState::WaitingForName);

            $this->queueMessage($bot, $account->telegram_user_id, 'سلام! لطفاً نام و نام خانوادگی خود را وارد کنید.');

            return;
        }

        $alreadyAccepted = TelegramTermsAcceptance::query()
            ->where('telegram_account_id', $account->id)
            ->where('telegram_legal_document_id', $activeTerms->id)
            ->exists();

        if ($alreadyAccepted) {
            $this->conversations->transition($conversation, ConversationState::WaitingForName);
            $this->queueMessage($bot, $account->telegram_user_id, 'لطفاً نام و نام خانوادگی خود را وارد کنید.');

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
            $this->conversations->transition($conversation, ConversationState::WaitingForName);
            $this->queueMessage($bot, $account->telegram_user_id, 'لطفاً نام و نام خانوادگی خود را وارد کنید.');

            return;
        }

        if ($data === 'reg:confirm' && $conversation->state === ConversationState::ConfirmingRegistration) {
            $this->sendOtp($bot, $account, $conversation);

            return;
        }

        if ($data === 'reg:cancel') {
            if ($conversation->state === ConversationState::ConfirmingRegistration) {
                $this->conversations->transition($conversation, ConversationState::WaitingForMobile);
                $this->queueMessage(
                    $bot,
                    $account->telegram_user_id,
                    'شماره موبایل را دوباره وارد کنید یا از دکمه «ارسال شماره تماس» استفاده کنید:',
                    ['reply_markup' => $this->registrationKeyboard->requestContactMarkup()],
                );

                return;
            }

            $this->conversations->reset($conversation);
            $this->queueMessage($bot, $account->telegram_user_id, 'فرآیند ثبت‌نام لغو شد.', [
                'reply_markup' => $this->mainMenu->remove(),
            ]);
        }
    }

    public function handleText(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        match ($conversation->state) {
            ConversationState::WaitingForName => $this->handleName($bot, $account, $conversation, $text),
            ConversationState::WaitingForMobile => $this->handleMobile($bot, $account, $conversation, $text),
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

        if ($contactUserId > 0 && $contactUserId !== $telegramUserId) {
            $this->queueMessage($bot, $account->telegram_user_id, 'لطفاً فقط شماره تماس خودتان را با دکمه «ارسال شماره تماس» بفرستید.');

            return;
        }

        $phone = trim((string) ($contact['phone_number'] ?? ''));
        if ($phone === '') {
            $this->queueMessage($bot, $account->telegram_user_id, 'شماره تماس دریافت نشد. دوباره تلاش کنید.');

            return;
        }

        $this->handleMobile($bot, $account, $conversation, $phone);
    }

    private function handleName(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        if (! $this->displayNameValidator->validate($text)) {
            $this->queueMessage($bot, $account->telegram_user_id, 'نام وارد شده معتبر نیست. لطفاً فقط حروف فارسی یا انگلیسی وارد کنید (۲ تا ۶۰ کاراکتر).');

            return;
        }

        $name = $this->displayNameValidator->normalize($text);
        $account->update(['display_name' => $name]);
        $this->conversations->transition($conversation, ConversationState::WaitingForMobile, ['display_name' => $name]);
        $this->queueMessage(
            $bot,
            $account->telegram_user_id,
            "شماره موبایل خود را وارد کنید (مثال: 09121234567)\n\nیا روی دکمه زیر بزنید تا شماره از حساب تلگرام شما ارسال شود:",
            ['reply_markup' => $this->registrationKeyboard->requestContactMarkup()],
        );
    }

    private function handleMobile(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        $mobile = $this->mobileNormalizer->normalize($text);

        if ($mobile === null) {
            $this->queueMessage(
                $bot,
                $account->telegram_user_id,
                'شماره موبایل معتبر نیست. لطفاً دوباره وارد کنید یا از دکمه «ارسال شماره تماس» استفاده کنید.',
                ['reply_markup' => $this->registrationKeyboard->requestContactMarkup()],
            );

            return;
        }

        $account->update(['mobile' => $mobile]);
        $this->conversations->transition($conversation, ConversationState::ConfirmingRegistration, ['mobile' => $mobile]);

        $this->queueMessage($bot, $account->telegram_user_id, TelegramHtml::bold('تایید اطلاعات')."\n\n"
            .'نام: '.TelegramHtml::escape((string) $account->display_name)."\n"
            .'موبایل: '.TelegramHtml::escape($mobile), [
                'parse_mode' => 'HTML',
                'reply_markup' => [
                    'inline_keyboard' => [[
                        ['text' => '✅ تایید و دریافت کد', 'callback_data' => 'reg:confirm'],
                        ['text' => '✏️ ویرایش', 'callback_data' => 'reg:cancel'],
                    ]],
                ],
            ]);
    }

    private function sendOtp(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation): void
    {
        try {
            $this->otp->sendForPurpose((string) $account->mobile, self::OTP_PURPOSE);
            $this->conversations->transition($conversation, ConversationState::WaitingForOtp);
            $hint = config('bahram.otp.dev_mode') && app()->environment('local', 'testing')
                ? ' (در حالت توسعه: کد ۱۲۳۴۵)'
                : '';
            $this->queueMessage($bot, $account->telegram_user_id, 'کد تایید به شماره موبایل شما ارسال شد. لطفاً کد ۵ رقمی را وارد کنید.'.$hint, [
                'reply_markup' => $this->mainMenu->remove(),
            ]);
        } catch (OtpException $e) {
            $this->queueMessage($bot, $account->telegram_user_id, $e->getMessage());
        }
    }

    private function handleOtp(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        $code = preg_replace('/\D/u', '', $text) ?? '';

        if (strlen($code) !== 5) {
            $this->queueMessage($bot, $account->telegram_user_id, 'کد باید ۵ رقم باشد.');

            return;
        }

        try {
            $this->otp->verifyForPurpose((string) $account->mobile, $code, self::OTP_PURPOSE);
        } catch (OtpException $e) {
            $this->queueMessage($bot, $account->telegram_user_id, $e->getMessage());

            return;
        }

        $summaryLines = [];

        try {
            DB::transaction(function () use ($account, $conversation, &$summaryLines): void {
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
