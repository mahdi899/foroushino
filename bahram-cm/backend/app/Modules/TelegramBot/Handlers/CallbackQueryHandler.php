<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\MainMenuKeyboard;
use App\Modules\TelegramBot\Services\RegistrationFlowService;
use App\Modules\TelegramBot\Services\RequiredChatMembershipService;
use App\Modules\TelegramBot\Services\TelegramCheckoutService;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Services\Exceptions\PaymentException;
use Illuminate\Validation\ValidationException;
use Throwable;

class CallbackQueryHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly RegistrationFlowService $registration,
        private readonly RequiredChatMembershipService $membership,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly TelegramBotClientFactory $clients,
        private readonly TelegramProductCatalogService $catalog,
        private readonly TelegramCheckoutService $checkout,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $callback = (array) data_get($update->payload, 'callback_query', []);
        $from = (array) ($callback['from'] ?? []);
        $telegramUserId = (int) ($from['id'] ?? 0);
        $callbackId = (string) ($callback['id'] ?? '');
        $data = (string) ($callback['data'] ?? '');
        $chatId = (int) data_get($callback, 'message.chat.id', $telegramUserId);

        if ($telegramUserId <= 0) {
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
            ],
        );

        $client = $this->clients->forBot($bot);

        if (str_starts_with($data, 'buy:')) {
            $this->handleBuy($client, $account, $chatId, $callbackId, $data);

            return;
        }

        if ($data === 'membership:recheck') {
            $this->handleMembershipRecheck($client, $bot, $account, $chatId, $callbackId);

            return;
        }

        $conversation = $this->conversations->forAccount($account);
        $this->registration->handleCallback($bot, $account, $conversation, $data);

        if ($callbackId !== '') {
            $client->answerCallbackQuery($callbackId);
        }
    }

    private function handleMembershipRecheck($client, TelegramBot $bot, TelegramAccount $account, int $chatId, string $callbackId): void
    {
        $this->membership->invalidateCache($bot, $account->telegram_user_id);

        if ($this->membership->isSatisfied($bot, $account)) {
            $this->answer($client, $callbackId, '✅ عضویت تأیید شد.');
            if ($account->isLinked() && $account->hasVerifiedMobile()) {
                $client->sendMessage($chatId, 'منوی اصلی:', [
                    'reply_markup' => $this->mainMenu->replyMarkup($account),
                ]);
            }

            return;
        }

        $this->answer($client, $callbackId, 'هنوز در همه کانال‌های اجباری عضو نیستید.', true);
        $this->membership->promptJoin($bot, $account);
    }

    private function handleBuy($client, TelegramAccount $account, int $chatId, string $callbackId, string $data): void
    {
        $productId = (int) substr($data, 4);
        if ($productId <= 0) {
            $this->answer($client, $callbackId, 'محصول نامعتبر است.');

            return;
        }

        if (! $account->isLinked() || ! $account->hasVerifiedMobile()) {
            $this->answer($client, $callbackId, 'ابتدا ثبت‌نام و تأیید موبایل را کامل کنید.', true);
            $client->sendMessage($chatId, 'برای خرید، ابتدا از /start ثبت‌نام را کامل کنید.');

            return;
        }

        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            $this->answer($client, $callbackId, 'این محصول در تلگرام موجود نیست.');

            return;
        }

        try {
            $result = $this->checkout->startCheckout($account, $product);
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: 'امکان شروع پرداخت وجود ندارد.';
            $this->answer($client, $callbackId, (string) $message, true);
            $client->sendMessage($chatId, (string) $message);

            return;
        } catch (PaymentException $e) {
            $message = $e->getMessage() ?: 'درگاه پرداخت زرین‌پال آماده نیست.';
            $this->answer($client, $callbackId, $message, true);
            $client->sendMessage($chatId, $message);

            return;
        } catch (Throwable $e) {
            $this->answer($client, $callbackId, 'خطا در اتصال به درگاه پرداخت.', true);
            $client->sendMessage($chatId, 'شروع پرداخت ناموفق بود. لطفاً دوباره تلاش کنید یا از سایت خرید کنید.');

            return;
        }

        $amount = number_format((int) $result['amount']);
        $this->answer($client, $callbackId, 'لینک پرداخت آماده شد.');
        $client->sendMessage(
            $chatId,
            "سفارش #{$result['order_id']}\n{$product->title}\nمبلغ قابل پرداخت: {$amount} تومان\n\nروی دکمه زیر بزنید تا به درگاه زرین‌پال بروید.",
            [
                'reply_markup' => [
                    'inline_keyboard' => [[
                        ['text' => '💳 پرداخت آنلاین', 'url' => $result['payment_url']],
                    ]],
                ],
            ],
        );
    }

    private function answer($client, string $callbackId, string $text, bool $showAlert = false): void
    {
        if ($callbackId === '') {
            return;
        }

        $client->answerCallbackQuery($callbackId, [
            'text' => mb_substr($text, 0, 200),
            'show_alert' => $showAlert,
        ]);
    }
}
