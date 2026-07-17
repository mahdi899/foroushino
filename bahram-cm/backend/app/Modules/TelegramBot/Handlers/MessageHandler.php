<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Models\SatApplication;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\BotAdminPanelService;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\MainMenuKeyboard;
use App\Modules\TelegramBot\Services\RegistrationFlowService;
use App\Modules\TelegramBot\Services\RequiredChatMembershipService;
use App\Modules\TelegramBot\Services\TelegramContentPresenter;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramSeminarCatalogService;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
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
        private readonly TelegramSeminarCatalogService $seminars,
        private readonly TelegramContentPresenter $content,
        private readonly ReferralService $referrals,
        private readonly BotAdminPanelService $botAdmin,
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

        $account->fill([
            'telegram_username' => $from['username'] ?? $account->telegram_username,
            'first_name' => $from['first_name'] ?? $account->first_name,
            'last_name' => $from['last_name'] ?? $account->last_name,
            'language_code' => $from['language_code'] ?? $account->language_code,
        ]);
        if ($account->isDirty()) {
            $account->save();
        }
        $account->syncPermanentAdminFlag();

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

        if ($account->isBotAdmin()) {
            if (isset($message['users_shared']) && $this->botAdmin->handleUsersShared($bot, $account, $conversation, $chatId, $message)) {
                return;
            }

            if (isset($message['photo']) && $this->botAdmin->handlePhotoInput($bot, $account, $conversation, $chatId, $message)) {
                return;
            }

            if ($text !== '' && $this->botAdmin->handleTextInput($bot, $account, $conversation, $chatId, $text)) {
                return;
            }
        }

        if ($account->isLinked() && $account->hasVerifiedMobile()) {
            if (! $this->membership->isSatisfied($bot, $account)) {
                $this->membership->promptJoin($bot, $account);

                return;
            }

            if ($this->mainMenu->isMenuButton($text, $account)) {
                $this->handleMenuButton($bot, $account, $chatId, $text);

                return;
            }
        }

        if (isset($message['contact'])) {
            $this->registration->handleContact($bot, $account, $conversation, $message);

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
            'سمینارها 🎤' => $this->sendSeminars($client, $chatId),
            'سات ☎️' => $this->sendSatStatus($client, $chatId, $account),
            'کانال مرجع 📣' => $this->sendReferenceChannel($client, $chatId),
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
            'پنل ادمین بات 🛠' => $this->botAdmin->openDashboard($bot, $account, $chatId),
            default => $client->sendMessage($chatId, 'منوی اصلی:', [
                'reply_markup' => $this->mainMenu->replyMarkup($account),
            ]),
        };
    }

    private function sendProducts($client, int $chatId): void
    {
        $products = $this->catalog->listPublicCourses();
        if ($products->isEmpty()) {
            $client->sendMessage(
                $chatId,
                "در حال حاضر دوره فعالی برای تلگرام تعریف نشده است.\nاز پنل سایت → تجارت → محصولات، گزینه «نمایش در تلگرام» را برای دوره فعال کنید."
            );

            return;
        }

        foreach ($products->take(10) as $product) {
            $client->sendMessage(
                $chatId,
                $this->content->formatProductMessage($product),
                $this->content->productSendOptions($product),
            );
        }
    }

    private function sendSeminars($client, int $chatId): void
    {
        $seminars = $this->seminars->listUpcoming();
        if ($seminars->isEmpty()) {
            $client->sendMessage($chatId, 'در حال حاضر سمینار فعالی برای نمایش وجود ندارد.');

            return;
        }

        foreach ($seminars as $seminar) {
            $client->sendMessage(
                $chatId,
                $this->content->formatSeminarMessage($seminar),
                $this->content->seminarSendOptions($seminar),
            );
        }
    }

    private function sendSatStatus($client, int $chatId, TelegramAccount $account): void
    {
        $satUrl = TelegramSiteUrl::satPage();

        if (! $account->user_id) {
            $this->sendWithLink($client, $chatId, 'ابتدا ثبت‌نام را کامل کنید.', $satUrl, '🌐 صفحه سات');

            return;
        }

        $app = SatApplication::query()->where('user_id', $account->user_id)->latest('id')->first();
        if ($app === null) {
            $this->sendWithLink(
                $client,
                $chatId,
                'درخواستی برای سات ثبت نشده است. برای ثبت از سایت اقدام کنید.',
                $satUrl,
                '🌐 ثبت درخواست سات',
            );

            return;
        }

        $this->sendWithLink(
            $client,
            $chatId,
            'وضعیت سات: '.(string) ($app->status ?? '—'),
            $satUrl,
            '🌐 مشاهده صفحه سات',
        );
    }

    private function sendReferenceChannel($client, int $chatId): void
    {
        $identityUrl = TelegramSiteUrl::identityPage();
        $this->sendWithLink(
            $client,
            $chatId,
            "کانال مرجع نیاز به خرید دوره کمپین‌نویسی و احراز هویت سطح ۲ دارد.\nبرای شروع احراز هویت از منوی حساب کاربری یا لینک زیر استفاده کنید.",
            $identityUrl,
            '🌐 احراز هویت',
        );
    }

    private function sendFamily($client, int $chatId, TelegramAccount $account): void
    {
        $familyUrl = TelegramSiteUrl::familyHome();

        if (! $account->user_id || ! $account->user) {
            $this->sendWithLink($client, $chatId, 'ابتدا ثبت‌نام را کامل کنید.', $familyUrl, '🌐 صفحه خانواده');

            return;
        }

        try {
            app(\App\Services\Family\FamilyAssignmentService::class)->assign($account->user);
            $message = 'خانواده شما فعال است. برای مشاهده محتوا وارد وب‌اپ خانواده شوید.';
        } catch (\Throwable) {
            $message = 'خانواده شما از طریق وب‌اپ دامنه اصلی در دسترس است.';
        }

        $this->sendWithLink($client, $chatId, $message, $familyUrl, '🌐 ورود به خانواده');
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
        $panelUrl = TelegramSiteUrl::studentPanel();
        $identityUrl = TelegramSiteUrl::identityPage();

        $keyboard = [];
        foreach (TelegramSiteUrl::urlKeyboardRow('🌐 احراز هویت', $identityUrl) as $row) {
            $keyboard[] = $row;
        }
        foreach (TelegramSiteUrl::urlKeyboardRow('🌐 ورود به پنل سایت', $panelUrl) as $row) {
            $keyboard[] = $row;
        }
        $keyboard[] = [['text' => 'دریافت لینک ورود', 'callback_data' => 'account:login_token']];

        $options = $keyboard !== []
            ? ['reply_markup' => ['inline_keyboard' => $keyboard]]
            : [];

        $client->sendMessage(
            $chatId,
            "حساب کاربری\nنام: {$name}\nموبایل: {$mobile}",
            $options,
        );
    }

    private function sendWithLink($client, int $chatId, string $message, ?string $url, string $label): void
    {
        $client->sendMessage(
            $chatId,
            $message,
            TelegramSiteUrl::linkMarkup($url, $label),
        );
    }
}
