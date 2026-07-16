<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\User;
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
            $this->conversations->reset($conversation);
            $this->queueMessage($bot, $account->telegram_user_id, 'فرآیند ثبت‌نام لغو شد.');
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

    private function handleName(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        if (! $this->displayNameValidator->validate($text)) {
            $this->queueMessage($bot, $account->telegram_user_id, 'نام وارد شده معتبر نیست. لطفاً فقط حروف فارسی یا انگلیسی وارد کنید (۲ تا ۶۰ کاراکتر).');

            return;
        }

        $name = $this->displayNameValidator->normalize($text);
        $account->update(['display_name' => $name]);
        $this->conversations->transition($conversation, ConversationState::WaitingForMobile, ['display_name' => $name]);
        $this->queueMessage($bot, $account->telegram_user_id, 'شماره موبایل خود را وارد کنید (مثال: 09121234567).');
    }

    private function handleMobile(TelegramBot $bot, TelegramAccount $account, TelegramConversation $conversation, string $text): void
    {
        $mobile = $this->mobileNormalizer->normalize($text);

        if ($mobile === null) {
            $this->queueMessage($bot, $account->telegram_user_id, 'شماره موبایل معتبر نیست. لطفاً دوباره وارد کنید.');

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
            $this->queueMessage($bot, $account->telegram_user_id, 'کد تایید به شماره موبایل شما ارسال شد. لطفاً کد ۵ رقمی را وارد کنید.');
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

        DB::transaction(function () use ($account, $conversation, $bot): void {
            $account->update(['mobile_verified_at' => now()]);

            $user = User::query()->firstOrCreate(
                ['mobile' => $account->mobile],
                [
                    'name' => $account->display_name,
                    'mobile_verified_at' => now(),
                ],
            );

            $this->accountLinks->linkToUser($account, $user);
            $this->conversations->transition($conversation, ConversationState::Idle);
        });

        $this->sendMainMenu($bot, $account);
        $this->queueMessage($bot, $account->telegram_user_id, '✅ ثبت‌نام با موفقیت انجام شد!');
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
            'reply_markup' => $this->mainMenu->replyMarkup(),
        ]);
    }

    /** @param  array<string, mixed>  $options */
    private function queueMessage(TelegramBot $bot, int $chatId, string $text, array $options = []): void
    {
        SendTelegramMessageJob::dispatch($bot->id, $chatId, $text, $options)
            ->onQueue(config('telegram_bot.queues.replies'));
    }
}
