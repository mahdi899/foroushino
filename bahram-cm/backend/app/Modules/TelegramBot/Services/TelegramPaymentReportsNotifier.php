<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Order;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
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

    /**
     * @return array{inline_keyboard: list<list<array<string, mixed>>>}
     */
    public function reviewKeyboard(int $orderId, int $approvedCount = 0, int $required = 2): array
    {
        $required = max(2, $required);
        $approvedCount = max(0, min($approvedCount, $required));

        return [
            'inline_keyboard' => [[
                [
                    'text' => TelegramCustomEmoji::buttonText("تأیید ({$approvedCount}/{$required})", 'check'),
                    'callback_data' => 'c2c:ok:'.$orderId,
                    'style' => 'success',
                    ...TelegramCustomEmoji::buttonIcon('check'),
                ],
                [
                    'text' => TelegramCustomEmoji::buttonText('رد', 'cross'),
                    'callback_data' => 'c2c:no:'.$orderId,
                    'style' => 'danger',
                    ...TelegramCustomEmoji::buttonIcon('cross'),
                ],
            ]],
        ];
    }

    public function notifyCardToCardReceipt(
        TelegramBot $bot,
        Order $order,
        string $fileId,
        string $kind,
        string $buyerName,
        string $mobile,
        int $telegramUserId,
        int $approvedCount = 0,
        int $requiredApprovals = 2,
    ): bool {
        $chatId = $bot->paymentReportsChatId();
        if (blank($chatId)) {
            Log::warning('payment_reports_chat_missing', ['order_id' => $order->id, 'bot_id' => $bot->id]);

            return false;
        }

        $amount = number_format((int) ($order->final_amount ?? 0));
        $product = htmlspecialchars((string) ($order->product?->title ?: '—'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $safeBuyer = htmlspecialchars($buyerName, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $safeMobile = htmlspecialchars($mobile, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $caption = TelegramCustomEmoji::tag('cash')." رسید کارت‌به‌کارت\n"
            ."────────────────\n"
            ."سفارش #{$order->id}\n"
            ."محصول: {$product}\n"
            .TelegramCustomEmoji::tag('coin')." مبلغ: <b>{$amount}</b> تومان\n"
            ."خریدار: {$safeBuyer}\n"
            ."موبایل: {$safeMobile}\n"
            ."تلگرام: <code>{$telegramUserId}</code>\n"
            .TelegramCustomEmoji::tag('warning').' نیاز به تأیید ۲ ادمین';

        $keyboard = $this->reviewKeyboard($order->id, $approvedCount, $requiredApprovals);
        $client = $this->clients->forBot($bot);

        try {
            if ($kind === 'document') {
                $client->sendDocument($chatId, $fileId, [
                    'caption' => $caption,
                    'parse_mode' => 'HTML',
                    'reply_markup' => $keyboard,
                ]);
            } else {
                $client->sendPhoto($chatId, $fileId, [
                    'caption' => $caption,
                    'parse_mode' => 'HTML',
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
                    'parse_mode' => 'HTML',
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
        $product = htmlspecialchars((string) ($order->product?->title ?: '—'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $user = $order->user;
        $userLabel = $user
            ? trim(($user->name ?? '').' · '.($user->mobile ?? ''))
            : '—';
        $safeUser = htmlspecialchars($userLabel, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $ref = filled($refId) ? htmlspecialchars((string) $refId, ENT_QUOTES | ENT_HTML5, 'UTF-8') : '—';

        $text = TelegramCustomEmoji::tag('check')." خرید موفق\n"
            ."────────────────\n"
            ."روش: {$gatewayLabel}\n"
            ."سفارش #{$order->id}\n"
            ."محصول: {$product}\n"
            .TelegramCustomEmoji::tag('coin')." مبلغ: <b>{$amount}</b> تومان\n"
            ."کاربر: {$safeUser}\n"
            ."رسید/رفرنس: {$ref}";

        foreach ($this->targets() as $target) {
            try {
                $this->clients->forBot($target['bot'])->sendMessage($target['chat_id'], $text, [
                    'parse_mode' => 'HTML',
                ]);
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
