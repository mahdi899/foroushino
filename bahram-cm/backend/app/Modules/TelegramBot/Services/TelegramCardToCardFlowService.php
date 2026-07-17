<?php

namespace App\Modules\TelegramBot\Services;

use App\Jobs\FulfillOrderJob;
use App\Models\Order;
use App\Models\Payment;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\AdminTelegramLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Card-to-card checkout: user sends receipt → bot admins review → fulfill/reject.
 */
class TelegramCardToCardFlowService
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly TelegramBotClientFactory $clients,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly AdminTelegramLogService $adminTelegram,
    ) {}

    public function beginWaitingForReceipt(
        TelegramBot $bot,
        TelegramAccount $account,
        int $chatId,
        int $orderId,
        string $productTitle,
        int $amount,
        string $instructions,
    ): void {
        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::WaitingForCardToCardReceipt, [
            'checkout' => [
                'order_id' => $orderId,
                'product_id' => data_get($conversation->context, 'checkout.product_id'),
                'coupon' => data_get($conversation->context, 'checkout.coupon'),
            ],
        ]);

        $client = $this->clients->forBot($bot);
        $amountLabel = number_format($amount);
        $client->sendMessage(
            $chatId,
            "سفارش #{$orderId}\n{$productTitle}\nمبلغ: {$amountLabel} تومان\n\n"
            ."🏧 راهنمای کارت‌به‌کارت:\n{$instructions}\n\n"
            ."📸 حالا عکس واضح رسید واریز را همین‌جا ارسال کنید.\n"
            .'برای انصراف «لغو» را بفرستید.',
            ['reply_markup' => $this->mainMenu->replyMarkup($account, $bot)],
        );
    }

    /** @param  array<string, mixed>  $message */
    public function handleUserMessage(
        TelegramBot $bot,
        TelegramAccount $account,
        int $chatId,
        array $message,
        string $text = '',
    ): void {
        $client = $this->clients->forBot($bot);
        $conversation = $this->conversations->forAccount($account);
        $orderId = (int) data_get($conversation->context, 'checkout.order_id');

        if ($orderId <= 0) {
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
            $client->sendMessage($chatId, 'سفارش کارت‌به‌کارت یافت نشد. دوباره از منو خرید کنید.', [
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ]);

            return;
        }

        if (in_array(trim($text), ['لغو', '/cancel'], true)) {
            $this->cancelPendingOrder($orderId);
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
            $client->sendMessage($chatId, 'سفارش کارت‌به‌کارت لغو شد.', [
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ]);

            return;
        }

        $file = $this->extractReceiptFile($message);
        if ($file === null) {
            $client->sendMessage(
                $chatId,
                "لطفاً فقط عکس رسید واریز را ارسال کنید (نه متن).\n"
                .'برای انصراف «لغو» را بفرستید.',
            );

            return;
        }

        $order = Order::query()->with('product')->find($orderId);
        if ($order === null || $order->status !== 'pending_payment') {
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
            $client->sendMessage($chatId, 'این سفارش دیگر در انتظار پرداخت نیست.', [
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ]);

            return;
        }

        $fileId = $file['file_id'];
        $extra = (array) ($order->customer_extra_data ?? []);
        $extra['card_to_card'] = [
            'status' => 'awaiting_review',
            'receipt_file_id' => $fileId,
            'receipt_kind' => $file['kind'],
            'receipt_message_id' => (int) ($message['message_id'] ?? 0),
            'submitted_at' => now()->toIso8601String(),
            'submitter_telegram_user_id' => (int) $account->telegram_user_id,
            'submitter_telegram_account_id' => (int) $account->id,
        ];
        $order->update(['customer_extra_data' => $extra]);

        Payment::query()->updateOrCreate(
            [
                'order_id' => $order->id,
                'gateway' => 'card_to_card',
            ],
            [
                'authority' => 'c2c-'.$order->id,
                'amount' => (int) ($order->final_amount ?? 0),
                'status' => 'pending',
                'request_payload' => [
                    'receipt_file_id' => $fileId,
                    'receipt_kind' => $file['kind'],
                    'telegram_user_id' => (int) $account->telegram_user_id,
                ],
            ],
        );

        $this->conversations->transition($conversation, ConversationState::Idle, [
            'checkout' => [
                'order_id' => $order->id,
                'awaiting_c2c_review' => true,
            ],
        ]);

        $client->sendMessage(
            $chatId,
            "✅ رسید سفارش #{$order->id} دریافت شد.\n"
            .'پس از بررسی ادمین، نتیجه همین‌جا اعلام می‌شود.',
            ['reply_markup' => $this->mainMenu->replyMarkup($account, $bot)],
        );

        $this->notifyAdmins($bot, $client, $order, $fileId, $file['kind'], $account);
    }

    public function handleAdminReviewCallback(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $callbackId,
        string $data,
    ): void {
        if (! $actor->isBotAdmin()) {
            $client->answerCallbackQuery($callbackId, [
                'text' => 'فقط ادمین بات می‌تواند بررسی کند.',
                'show_alert' => true,
            ]);

            return;
        }

        $approve = str_starts_with($data, 'c2c:ok:');
        $orderId = (int) substr($data, strlen($approve ? 'c2c:ok:' : 'c2c:no:'));
        if ($orderId <= 0) {
            $client->answerCallbackQuery($callbackId, ['text' => 'سفارش نامعتبر', 'show_alert' => true]);

            return;
        }

        try {
            if ($approve) {
                $this->approveOrder($bot, $client, $actor, $orderId, $chatId, $messageId);
                $client->answerCallbackQuery($callbackId, ['text' => 'تأیید و تحویل شد ✅']);
            } else {
                $this->rejectOrder($bot, $client, $actor, $orderId, $chatId, $messageId);
                $client->answerCallbackQuery($callbackId, ['text' => 'رد شد']);
            }
        } catch (RuntimeException $e) {
            $client->answerCallbackQuery($callbackId, [
                'text' => $e->getMessage(),
                'show_alert' => true,
            ]);
        } catch (Throwable $e) {
            Log::warning('card_to_card_review_failed', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);
            $client->answerCallbackQuery($callbackId, [
                'text' => 'خطا در بررسی سفارش',
                'show_alert' => true,
            ]);
        }
    }

    private function approveOrder(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        TelegramAccount $actor,
        int $orderId,
        int $adminChatId,
        int $adminMessageId,
    ): void {
        $order = DB::transaction(function () use ($orderId, $actor) {
            /** @var Order|null $order */
            $order = Order::query()->lockForUpdate()->with('product')->find($orderId);
            if ($order === null) {
                throw new RuntimeException('سفارش یافت نشد.');
            }
            if ($order->isPaid()) {
                throw new RuntimeException('این سفارش قبلاً تأیید شده است.');
            }
            if ($order->status !== 'pending_payment') {
                throw new RuntimeException('وضعیت سفارش قابل تأیید نیست.');
            }

            $extra = (array) ($order->customer_extra_data ?? []);
            $c2c = (array) ($extra['card_to_card'] ?? []);
            if (($c2c['status'] ?? '') === 'approved') {
                throw new RuntimeException('این سفارش قبلاً تأیید شده است.');
            }

            $c2c['status'] = 'approved';
            $c2c['reviewed_at'] = now()->toIso8601String();
            $c2c['reviewed_by_telegram_user_id'] = (int) $actor->telegram_user_id;
            $c2c['reviewed_by_account_id'] = (int) $actor->id;
            $extra['card_to_card'] = $c2c;

            $order->update([
                'status' => 'paid',
                'payment_status' => 'paid',
                'paid_at' => now(),
                'customer_extra_data' => $extra,
            ]);

            Payment::query()->updateOrCreate(
                [
                    'order_id' => $order->id,
                    'gateway' => 'card_to_card',
                ],
                [
                    'authority' => 'c2c-'.$order->id,
                    'ref_id' => 'C2C-'.$order->id.'-'.now()->format('YmdHis'),
                    'amount' => (int) ($order->final_amount ?? 0),
                    'status' => 'paid',
                    'paid_at' => now(),
                    'verify_payload' => [
                        'approved_by_telegram_user_id' => (int) $actor->telegram_user_id,
                        'approved_at' => now()->toIso8601String(),
                    ],
                ],
            );

            return $order->fresh('product');
        });

        $this->adminTelegram->notifyOrderPaid($order, 'card_to_card');
        $this->dispatchFulfillment($order->id);

        $reviewer = $actor->adminDisplayName() ?: ($actor->display_name ?: 'ادمین');
        $this->updateAdminReviewMessage(
            $client,
            $adminChatId,
            $adminMessageId,
            "✅ تأیید شد توسط {$reviewer}\nسفارش #{$order->id} پرداخت‌شده و در حال تحویل است.",
        );

        $this->notifyBuyer(
            $bot,
            $client,
            $order,
            "✅ پرداخت سفارش #{$order->id} تأیید شد.\n"
            .'دسترسی/لایسنس به‌زودی برایتان فعال می‌شود.',
        );
    }

    private function rejectOrder(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        TelegramAccount $actor,
        int $orderId,
        int $adminChatId,
        int $adminMessageId,
    ): void {
        $order = DB::transaction(function () use ($orderId, $actor) {
            /** @var Order|null $order */
            $order = Order::query()->lockForUpdate()->with('product')->find($orderId);
            if ($order === null) {
                throw new RuntimeException('سفارش یافت نشد.');
            }
            if ($order->isPaid()) {
                throw new RuntimeException('سفارش پرداخت‌شده قابل رد نیست.');
            }
            if ($order->status !== 'pending_payment') {
                throw new RuntimeException('وضعیت سفارش قابل رد نیست.');
            }

            $extra = (array) ($order->customer_extra_data ?? []);
            $c2c = (array) ($extra['card_to_card'] ?? []);
            $c2c['status'] = 'rejected';
            $c2c['reviewed_at'] = now()->toIso8601String();
            $c2c['reviewed_by_telegram_user_id'] = (int) $actor->telegram_user_id;
            $c2c['reviewed_by_account_id'] = (int) $actor->id;
            $extra['card_to_card'] = $c2c;
            $order->update(['customer_extra_data' => $extra]);

            Payment::query()
                ->where('order_id', $order->id)
                ->where('gateway', 'card_to_card')
                ->where('status', 'pending')
                ->update(['status' => 'failed']);

            return $order->fresh('product');
        });

        $reviewer = $actor->adminDisplayName() ?: ($actor->display_name ?: 'ادمین');
        $this->updateAdminReviewMessage(
            $client,
            $adminChatId,
            $adminMessageId,
            "❌ رد شد توسط {$reviewer}\nسفارش #{$order->id} — کاربر می‌تواند رسید جدید بفرستد.",
        );

        $buyerAccount = $this->resolveBuyerAccount($bot, $order);
        if ($buyerAccount !== null) {
            $conversation = $this->conversations->forAccount($buyerAccount);
            $this->conversations->transition($conversation, ConversationState::WaitingForCardToCardReceipt, [
                'checkout' => ['order_id' => $order->id],
            ]);
        }

        $this->notifyBuyer(
            $bot,
            $client,
            $order,
            "❌ رسید سفارش #{$order->id} تأیید نشد.\n"
            ."لطفاً عکس واضح‌تر رسید را دوباره ارسال کنید یا «لغو» بفرستید.",
        );
    }

    private function notifyAdmins(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        Order $order,
        string $fileId,
        string $kind,
        TelegramAccount $buyer,
    ): void {
        $amount = number_format((int) ($order->final_amount ?? 0));
        $buyerName = $buyer->adminDisplayName()
            ?: ($buyer->display_name ?: trim(($buyer->first_name ?? '').' '.($buyer->last_name ?? '')) ?: 'کاربر');
        $mobile = $buyer->mobile ?: ($order->customer_phone ?: '—');
        $product = $order->product?->title ?: '—';

        $caption = "🏧 رسید کارت‌به‌کارت\n"
            ."سفارش #{$order->id}\n"
            ."محصول: {$product}\n"
            ."مبلغ: {$amount} تومان\n"
            ."خریدار: {$buyerName}\n"
            ."موبایل: {$mobile}\n"
            ."تلگرام: #{$buyer->telegram_user_id}";

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '✅ تأیید پرداخت', 'callback_data' => 'c2c:ok:'.$order->id],
                    ['text' => '❌ رد رسید', 'callback_data' => 'c2c:no:'.$order->id],
                ],
            ],
        ];

        $admins = $this->botAdmins($bot);
        $targets = array_values(array_filter(
            $admins,
            fn (TelegramAccount $admin) => (int) $admin->telegram_user_id !== (int) $buyer->telegram_user_id,
        ));
        if ($targets === []) {
            $targets = $admins;
        }

        foreach ($targets as $admin) {
            try {
                if ($kind === 'document') {
                    $client->sendDocument((int) $admin->telegram_user_id, $fileId, [
                        'caption' => $caption,
                        'reply_markup' => $keyboard,
                    ]);
                } else {
                    $client->sendPhoto((int) $admin->telegram_user_id, $fileId, [
                        'caption' => $caption,
                        'reply_markup' => $keyboard,
                    ]);
                }
            } catch (Throwable $e) {
                Log::warning('card_to_card_admin_notify_failed', [
                    'admin_id' => $admin->id,
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
                try {
                    $client->sendMessage((int) $admin->telegram_user_id, $caption."\n\n(ارسال فایل رسید ناموفق بود)", [
                        'reply_markup' => $keyboard,
                    ]);
                } catch (Throwable) {
                    // ignore
                }
            }
        }
    }

    /** @return list<TelegramAccount> */
    private function botAdmins(TelegramBot $bot): array
    {
        return TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_blocked', false)
            ->where('is_bot_admin', true)
            ->get()
            ->filter(fn (TelegramAccount $a) => $a->isBotAdmin())
            ->values()
            ->all();
    }

    private function resolveBuyerAccount(TelegramBot $bot, Order $order): ?TelegramAccount
    {
        $submitterId = (int) data_get($order->customer_extra_data, 'card_to_card.submitter_telegram_account_id');
        if ($submitterId > 0) {
            $byId = TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->whereKey($submitterId)
                ->first();
            if ($byId) {
                return $byId;
            }
        }

        $telegramUserId = (int) data_get($order->customer_extra_data, 'card_to_card.submitter_telegram_user_id');
        if ($telegramUserId > 0) {
            $byTg = TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('telegram_user_id', $telegramUserId)
                ->first();
            if ($byTg) {
                return $byTg;
            }
        }

        if ($order->user_id) {
            return TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('user_id', $order->user_id)
                ->first();
        }

        return null;
    }

    private function notifyBuyer(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        Order $order,
        string $text,
    ): void {
        $buyer = $this->resolveBuyerAccount($bot, $order);
        if ($buyer === null) {
            return;
        }

        try {
            $client->sendMessage((int) $buyer->telegram_user_id, $text, [
                'reply_markup' => $this->mainMenu->replyMarkup($buyer, $bot),
            ]);
        } catch (Throwable $e) {
            Log::warning('card_to_card_buyer_notify_failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function updateAdminReviewMessage(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $resultLine,
    ): void {
        try {
            $client->editMessageCaption([
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'caption' => $resultLine,
                'reply_markup' => ['inline_keyboard' => []],
            ]);
        } catch (Throwable) {
            try {
                $client->editMessageText($resultLine, [
                    'chat_id' => $chatId,
                    'message_id' => $messageId,
                    'reply_markup' => ['inline_keyboard' => []],
                ]);
            } catch (Throwable) {
                try {
                    $client->editMessageReplyMarkup([
                        'chat_id' => $chatId,
                        'message_id' => $messageId,
                        'reply_markup' => ['inline_keyboard' => []],
                    ]);
                } catch (Throwable) {
                    // ignore
                }
            }
        }
    }

    /**
     * @param  array<string, mixed>  $message
     * @return array{file_id: string, kind: string}|null
     */
    private function extractReceiptFile(array $message): ?array
    {
        $photos = $message['photo'] ?? null;
        if (is_array($photos) && $photos !== []) {
            $largest = $photos[array_key_last($photos)] ?? null;
            $fileId = (string) ($largest['file_id'] ?? '');

            return $fileId !== '' ? ['file_id' => $fileId, 'kind' => 'photo'] : null;
        }

        $document = (array) ($message['document'] ?? []);
        $mime = (string) ($document['mime_type'] ?? '');
        $fileId = (string) ($document['file_id'] ?? '');
        if ($fileId !== '' && (str_starts_with($mime, 'image/') || $mime === 'application/pdf')) {
            return ['file_id' => $fileId, 'kind' => 'document'];
        }

        return null;
    }

    private function cancelPendingOrder(int $orderId): void
    {
        $order = Order::query()->find($orderId);
        if ($order === null || $order->status !== 'pending_payment') {
            return;
        }

        $extra = (array) ($order->customer_extra_data ?? []);
        $c2c = (array) ($extra['card_to_card'] ?? []);
        $c2c['status'] = 'cancelled';
        $c2c['cancelled_at'] = now()->toIso8601String();
        $extra['card_to_card'] = $c2c;

        $order->update([
            'status' => 'cancelled',
            'payment_status' => 'failed',
            'customer_extra_data' => $extra,
        ]);

        Payment::query()
            ->where('order_id', $order->id)
            ->where('gateway', 'card_to_card')
            ->where('status', 'pending')
            ->update(['status' => 'canceled']);
    }

    private function dispatchFulfillment(int $orderId): void
    {
        if (app()->environment('local') && ! app()->runningUnitTests()) {
            FulfillOrderJob::dispatchSync($orderId);

            return;
        }

        FulfillOrderJob::dispatch($orderId);
    }
}
