<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Order;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends payment reports (C2C + successful payments) to the configured payment reports chat.
 */
class TelegramPaymentReportsNotifier
{
    public function __construct(
        private readonly TelegramBotClientFactory $clients,
    ) {}

    /**
     * @return list<array{bot: TelegramBot, chat_id: string}>
     */
    public function targets(?TelegramBot $preferred = null): array
    {
        if ($preferred !== null) {
            $chatId = $preferred->paymentReportsChatId();
            if (filled($chatId)) {
                return [['bot' => $preferred, 'chat_id' => (string) $chatId]];
            }

            return [];
        }

        $out = [];
        foreach (TelegramBot::query()->where('is_active', true)->get() as $bot) {
            $chatId = $bot->paymentReportsChatId();
            if (filled($chatId)) {
                $out[] = ['bot' => $bot, 'chat_id' => (string) $chatId];
            }
        }

        return $out;
    }

    public function notifyCardToCardReceipt(
        TelegramBot $bot,
        Order $order,
        string $fileId,
        string $kind,
        string $buyerName,
        string $mobile,
        int $telegramUserId,
    ): bool {
        $chatId = $bot->paymentReportsChatId();
        if (blank($chatId)) {
            Log::warning('payment_reports_chat_missing', ['order_id' => $order->id, 'bot_id' => $bot->id]);

            return false;
        }

        $amount = number_format((int) ($order->final_amount ?? 0));
        $product = $order->product?->title ?: '—';
        $caption = "🏧 رسید کارت‌به‌کارت\n"
            ."────────────────\n"
            ."سفارش #{$order->id}\n"
            ."محصول: {$product}\n"
            ."مبلغ: {$amount} تومان\n"
            ."خریدار: {$buyerName}\n"
            ."موبایل: {$mobile}\n"
            ."تلگرام: `{$telegramUserId}`";

        $keyboard = [
            'inline_keyboard' => [[
                ['text' => '✅ تأیید پرداخت', 'callback_data' => 'c2c:ok:'.$order->id],
                ['text' => '❌ رد رسید', 'callback_data' => 'c2c:no:'.$order->id],
            ]],
        ];

        $client = $this->clients->forBot($bot);

        try {
            if ($kind === 'document') {
                $client->sendDocument($chatId, $fileId, [
                    'caption' => $caption,
                    'parse_mode' => 'Markdown',
                    'reply_markup' => $keyboard,
                ]);
            } else {
                $client->sendPhoto($chatId, $fileId, [
                    'caption' => $caption,
                    'parse_mode' => 'Markdown',
                    'reply_markup' => $keyboard,
                ]);
            }

            return true;
        } catch (Throwable $e) {
            Log::warning('payment_reports_c2c_failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            try {
                $client->sendMessage($chatId, $caption."\n\n(ارسال فایل رسید ناموفق بود)", [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => $keyboard,
                ]);

                return true;
            } catch (Throwable) {
                return false;
            }
        }
    }

    public function notifyOrderPaid(Order $order, ?string $gateway = null, ?string $refId = null): void
    {
        $order->loadMissing('product', 'user');
        $gatewayLabel = match ($gateway) {
            'card_to_card', 'c2c' => 'کارت‌به‌کارت',
            'zarinpal' => 'زرین‌پال',
            'free' => 'رایگان',
            default => $gateway ?: ($order->payments()->latest('id')->value('gateway') ?: 'پرداخت'),
        };

        if ($gatewayLabel === 'پرداخت' || $gateway === null) {
            $latestGateway = (string) ($order->payments()->latest('id')->value('gateway') ?? '');
            $gatewayLabel = match ($latestGateway) {
                'card_to_card' => 'کارت‌به‌کارت',
                'zarinpal' => 'زرین‌پال',
                'free' => 'رایگان',
                default => $latestGateway !== '' ? $latestGateway : 'پرداخت موفق',
            };
            if ($refId === null) {
                $refId = $order->payments()->latest('id')->value('ref_id');
            }
        }

        $amount = number_format((int) ($order->final_amount ?? 0));
        $product = $order->product?->title ?: '—';
        $user = $order->user;
        $userLabel = $user
            ? trim(($user->name ?? '').' · '.($user->mobile ?? ''))
            : '—';
        $ref = filled($refId) ? (string) $refId : '—';

        $text = "✅ خرید موفق\n"
            ."────────────────\n"
            ."روش: {$gatewayLabel}\n"
            ."سفارش #{$order->id}\n"
            ."محصول: {$product}\n"
            ."مبلغ: {$amount} تومان\n"
            ."کاربر: {$userLabel}\n"
            ."رسید/رفرنس: {$ref}";

        foreach ($this->targets() as $target) {
            try {
                $this->clients->forBot($target['bot'])->sendMessage($target['chat_id'], $text);
            } catch (Throwable $e) {
                Log::warning('payment_reports_paid_failed', [
                    'order_id' => $order->id,
                    'bot_id' => $target['bot']->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
