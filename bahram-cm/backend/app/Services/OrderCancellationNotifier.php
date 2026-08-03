<?php

namespace App\Services;

use App\Enums\OrderCancellationReason;
use App\Models\Order;
use App\Models\SmsLog;
use App\Models\TelegramAccount;
use App\Enums\SmsEventKey;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Services\NotificationOutboxWriter;
use App\Services\TelegramHostAccountSync;
use App\Modules\TelegramBot\Services\TelegramInfrastructureService;
use App\Modules\TelegramBot\Support\BotMessageRenderer;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use Illuminate\Support\Facades\Log;

class OrderCancellationNotifier
{
    public function __construct(
        private readonly SmsService $sms,
        private readonly BotMessageRenderer $renderer,
    ) {}

    public function notify(Order $order, OrderCancellationReason $reason): void
    {
        if (! $reason->notifyCustomer() || $this->alreadyNotified($order)) {
            return;
        }

        $order->loadMissing('product', 'user');

        $this->sms->sendOrderCancelled($order, $reason->label());
        $this->notifyTelegram($order);
        $this->markNotified($order);
    }

    private function alreadyNotified(Order $order): bool
    {
        if (filled(data_get($order->customer_extra_data, 'cancellation_notify.sent_at'))) {
            return true;
        }

        return SmsLog::query()
            ->where('event_key', SmsEventKey::OrderCancelled->value)
            ->where('mobile', $order->customer_phone)
            ->where('status', 'sent')
            ->where('message', 'like', '%'.$order->order_number.'%')
            ->exists();
    }

    private function markNotified(Order $order): void
    {
        $extra = (array) ($order->customer_extra_data ?? []);
        $extra['cancellation_notify'] = [
            'sent_at' => now()->toIso8601String(),
        ];
        $order->forceFill(['customer_extra_data' => $extra])->saveQuietly();
    }

    private function notifyTelegram(Order $order): void
    {
        $userId = $order->user_id;
        if ($userId === null) {
            return;
        }

        $siteUrl = TelegramSiteUrl::resolve(
            $order->product?->landing_href,
            $order->product?->slug,
        ) ?? TelegramSiteUrl::frontendBase();

        $templateVars = [
            'order_number' => (string) ($order->order_number ?? $order->id),
            'product_title' => (string) ($order->product?->title ?? '—'),
            'site_url' => (string) $siteUrl,
        ];

        $text = $this->renderer->renderDefault('order_cancelled', $templateVars);
        $keyboard = TelegramSiteUrl::urlKeyboardRow('بازگشت به سایت', $siteUrl, 'primary', 'globe');
        $options = $keyboard !== [] ? ['reply_markup' => ['inline_keyboard' => $keyboard]] : [];

        $notification = [
            'template_key' => 'order_cancelled',
            'template_vars' => $templateVars,
            'options' => $options,
            'text' => $text,
        ];

        $accounts = TelegramAccount::query()
            ->where('user_id', $userId)
            ->whereHas('bot', fn ($q) => $q->where('key', 'production'))
            ->with('bot')
            ->get();

        if ($accounts->isEmpty()) {
            return;
        }

        $usesHost = app(TelegramInfrastructureService::class)->usesHostBridge();
        $hostSync = app(TelegramHostAccountSync::class);
        $delivered = false;

        if ($usesHost) {
            foreach ($accounts as $account) {
                if ($hostSync->pushPaidOrderNotification($account, $notification)) {
                    $delivered = true;
                }
            }
        }

        if (! $delivered) {
            foreach ($accounts as $account) {
                if ($account->bot === null) {
                    continue;
                }
                try {
                    app(TelegramBotClientFactory::class)
                        ->forBot($account->bot)
                        ->sendMessage((int) $account->telegram_user_id, $text, $options);
                    $delivered = true;
                } catch (\Throwable $e) {
                    Log::channel('telegram')->warning('Direct order_cancelled Telegram send failed.', [
                        'order_id' => $order->id,
                        'telegram_user_id' => $account->telegram_user_id,
                        'message' => $e->getMessage(),
                    ]);
                }
            }
        }

        if (! $delivered) {
            try {
                app(NotificationOutboxWriter::class)->write(
                    eventType: 'order_cancelled',
                    userId: $userId,
                    payload: $notification,
                    channels: ['telegram'],
                    idempotencyKey: 'order_cancelled:'.$order->id,
                );
            } catch (\Throwable $e) {
                Log::channel('telegram')->warning('Failed to enqueue telegram order_cancelled outbox.', [
                    'order_id' => $order->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }
    }
}
