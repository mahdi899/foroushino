<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Models\SatApplication;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\MainMenuKeyboard;
use App\Modules\TelegramBot\Services\RegistrationFlowService;
use App\Modules\TelegramBot\Services\RequiredChatMembershipService;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Services\ReferralService;

class MessageHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly RegistrationFlowService $registration,
        private readonly RequiredChatMembershipService $membership,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly TelegramBotClientFactory $clients,
        private readonly TelegramProductCatalogService $catalog,
        private readonly ReferralService $referrals,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $message = (array) data_get($update->payload, 'message', []);
        $from = (array) ($message['from'] ?? []);
        $telegramUserId = (int) ($from['id'] ?? 0);
        $chatId = (int) data_get($message, 'chat.id', $telegramUserId);

        if ($telegramUserId <= 0) {
            return;
        }

        // Support-group admin replies are handled separately when chat matches support group.
        if (
            filled($bot->support_group_chat_id)
            && (string) data_get($message, 'chat.id') === (string) $bot->support_group_chat_id
        ) {
            app(\App\Modules\TelegramBot\Services\SupportAdminReplyService::class)
                ->handleIncomingSupportMessage($bot, $message);

            return;
        }

        $account = TelegramAccount::query()->firstOrCreate(
            [
                'telegram_bot_id' => $bot->id,
                'telegram_user_id' => $telegramUserId,
            ],
            [
                'telegram_username' => $from['username'] ?? null,
                'first_name' => $from['first_name'] ?? null,
                'last_name' => $from['last_name'] ?? null,
                'language_code' => $from['language_code'] ?? null,
            ],
        );

        $conversation = $this->conversations->forAccount($account);
        $text = trim((string) ($message['text'] ?? ''));

        if (str_starts_with($text, '/start')) {
            $payload = trim(substr($text, 6));
            if ($payload !== '') {
                $this->conversations->mergeContext($conversation, ['start_payload' => $payload]);
            }
            $this->registration->start($bot, $account, $conversation);

            return;
        }

        if ($account->isLinked() && $account->hasVerifiedMobile()) {
            if (! $this->membership->isSatisfied($bot, $account)) {
                $this->membership->promptJoin($bot, $account);

                return;
            }

            if ($this->mainMenu->isMenuButton($text)) {
                $this->handleMenuButton($bot, $account, $chatId, $text);

                return;
            }
        }

        if (isset($message['contact']['phone_number'])) {
            $this->registration->handleText($bot, $account, $conversation, (string) $message['contact']['phone_number']);

            return;
        }

        if ($text !== '') {
            $this->registration->handleText($bot, $account, $conversation, $text);
        }
    }

    private function handleMenuButton(TelegramBot $bot, TelegramAccount $account, int $chatId, string $text): void
    {
        $client = $this->clients->forBot($bot);

        match ($text) {
            'دوره کمپین نویسی 🎓' => $this->sendProducts($client, $chatId),
            'سمینارها 🎤' => $client->sendMessage($chatId, 'سمینارهای آینده از پنل سمینار سایت همگام می‌شوند. به‌زودی جزئیات داخل ربات تکمیل می‌شود.'),
            'سات ☎️' => $this->sendSatStatus($client, $chatId, $account),
            'کانال مرجع 📣' => $client->sendMessage($chatId, "کانال مرجع نیاز به خرید دوره کمپین‌نویسی و احراز هویت سطح ۲ دارد.\nبرای شروع احراز هویت از منوی حساب کاربری استفاده کنید."),
            'خانواده 👨‍👩‍👧‍👦' => $this->sendFamily($client, $chatId, $account),
            'معرفی دوستان 🎁' => $this->sendReferral($client, $chatId, $account),
            'پشتیبانی 🎫' => $client->sendMessage($chatId, 'دسته پشتیبانی را انتخاب کنید:', [
                'reply_markup' => [
                    'inline_keyboard' => [
                        [['text' => 'خرید و پرداخت', 'callback_data' => 'support:cat:purchase']],
                        [['text' => 'دوره کمپین‌نویسی', 'callback_data' => 'support:cat:campaign_course']],
                        [['text' => 'سایر', 'callback_data' => 'support:cat:other']],
                    ],
                ],
            ]),
            'حساب کاربری 👤' => $this->sendAccount($client, $chatId, $account),
            default => $client->sendMessage($chatId, 'منوی اصلی:', [
                'reply_markup' => $this->mainMenu->replyMarkup(),
            ]),
        };
    }

    private function sendProducts($client, int $chatId): void
    {
        $products = $this->catalog->listPublic();
        if ($products->isEmpty()) {
            $client->sendMessage($chatId, 'در حال حاضر محصول فعالی برای تلگرام تعریف نشده است.');

            return;
        }

        $lines = ["دوره‌های قابل خرید:\n"];
        foreach ($products->take(10) as $product) {
            $price = number_format((int) ($product->sale_price ?? $product->price));
            $lines[] = "• {$product->title} — {$price} تومان";
        }
        $client->sendMessage($chatId, implode("\n", $lines));
    }

    private function sendSatStatus($client, int $chatId, TelegramAccount $account): void
    {
        if (! $account->user_id) {
            $client->sendMessage($chatId, 'ابتدا ثبت‌نام را کامل کنید.');

            return;
        }

        $app = SatApplication::query()->where('user_id', $account->user_id)->latest('id')->first();
        if ($app === null) {
            $client->sendMessage($chatId, 'درخواستی برای سات ثبت نشده است. برای ثبت از سایت یا دکمه ثبت درخواست استفاده کنید.');

            return;
        }

        $client->sendMessage($chatId, 'وضعیت سات: '.(string) ($app->status ?? '—'));
    }

    private function sendFamily($client, int $chatId, TelegramAccount $account): void
    {
        if (! $account->user_id || ! $account->user) {
            $client->sendMessage($chatId, 'ابتدا ثبت‌نام را کامل کنید.');

            return;
        }

        try {
            app(\App\Services\Family\FamilyAssignmentService::class)->assign($account->user);
            $client->sendMessage($chatId, 'خانواده شما فعال است. برای مشاهده محتوا از وب‌اپ خانواده روی دامنه اصلی استفاده کنید.');
        } catch (\Throwable) {
            $client->sendMessage($chatId, 'خانواده شما از طریق اپ/وب‌اپ دامنه اصلی در دسترس است.');
        }
    }

    private function sendReferral($client, int $chatId, TelegramAccount $account): void
    {
        try {
            $code = $this->referrals->getOrCreateCode($account->user);
            $summary = $this->referrals->summary($account->user);
            $client->sendMessage(
                $chatId,
                "لینک معرفی:\n/start ref_{$code->code}\n\n"
                .'ثبت‌نام‌ها: '.($summary['registrations'] ?? $summary['signups'] ?? 0)."\n"
                .'پاداش قابل برداشت: '.number_format((int) ($summary['withdrawable'] ?? $summary['balance'] ?? 0)).' تومان'
            );
        } catch (\Throwable) {
            $client->sendMessage($chatId, 'در حال حاضر امکان نمایش لینک معرفی وجود ندارد.');
        }
    }

    private function sendAccount($client, int $chatId, TelegramAccount $account): void
    {
        $name = $account->display_name ?: ($account->user?->name ?? 'کاربر');
        $mobile = $account->mobile ? preg_replace('/^(\d{4})\d+(\d{4})$/', '$1***$2', $account->mobile) : '—';

        $keyboard = [
            [['text' => 'ورود به پنل', 'callback_data' => 'account:login_token']],
        ];

        $identityUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', '')), '/').'/telegram/identity';
        if (str_starts_with($identityUrl, 'https://')) {
            array_unshift($keyboard, [['text' => 'احراز هویت', 'web_app' => ['url' => $identityUrl]]]);
        }

        $client->sendMessage($chatId, "حساب کاربری\nنام: {$name}\nموبایل: {$mobile}", [
            'reply_markup' => [
                'inline_keyboard' => $keyboard,
            ],
        ]);
    }
}
