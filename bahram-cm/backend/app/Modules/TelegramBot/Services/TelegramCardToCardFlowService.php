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
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
use App\Services\AdminTelegramLogService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Card-to-card checkout: user sends receipt → payment reports group dual-admin review → fulfill/reject.
 */
class TelegramCardToCardFlowService
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly TelegramBotClientFactory $clients,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly AdminTelegramLogService $adminTelegram,
        private readonly TelegramPaymentReportsNotifier $paymentReports,
    ) {}

    public function beginWaitingForReceipt(
        TelegramBot $bot,
        TelegramAccount $account,
        int $chatId,
        int $orderId,
        string $productTitle,
        int $amount,
        string $instructions,
        ?int $ttlMinutes = null,
    ): void {
        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::WaitingForCardToCardReceipt, [
            'checkout' => [
                'order_id' => $orderId,
                'product_id' => data_get($conversation->context, 'checkout.product_id'),
                'coupon' => data_get($conversation->context, 'checkout.coupon'),
            ],
        ]);

        $ttl = $ttlMinutes ?? max(1, (int) config('bahram.orders.card_to_card_pending_ttl_minutes', 10));
        $client = $this->clients->forBot($bot);
        $amountLabel = number_format($amount);
        $safeTitle = htmlspecialchars($productTitle, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $safeInstructions = htmlspecialchars($instructions, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $text = TelegramCustomEmoji::tag('cash')." سفارش #{$orderId}\n"
            ."<b>{$safeTitle}</b>\n"
            .TelegramCustomEmoji::tag('coin')." مبلغ: <b>{$amountLabel}</b> تومان\n\n"
            .TelegramCustomEmoji::tag('money')." راهنمای کارت‌به‌کارت:\n{$safeInstructions}\n\n"
            .TelegramCustomEmoji::tag('warning')." مهلت ارسال رسید: <b>{$ttl} دقیقه</b>\n"
            .TelegramCustomEmoji::tag('pin')." حالا عکس واضح رسید واریز را همین‌جا ارسال کنید.\n"
            .'برای انصراف «لغو» را بفرستید.';

        $client->sendMessage($chatId, $text, [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
        ]);
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
            $client->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('warning').' سفارش کارت‌به‌کارت یافت نشد. دوباره از منو خرید کنید.',
                [
                    'parse_mode' => 'HTML',
                    'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
                ],
            );

            return;
        }

        if (in_array(trim($text), ['لغو', '/cancel'], true)) {
            $this->cancelPendingOrder($orderId, 'user_cancel');
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
            $client->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('warning').' سفارش شما لغو شد.',
                [
                    'parse_mode' => 'HTML',
                    'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
                ],
            );

            return;
        }

        $file = $this->extractReceiptFile($message);
        if ($file === null) {
            $client->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('pin')." لطفاً فقط عکس رسید واریز را ارسال کنید (نه متن).\n"
                .'برای انصراف «لغو» را بفرستید.',
                ['parse_mode' => 'HTML'],
            );

            return;
        }

        $order = Order::query()->with('product')->find($orderId);
        if ($order === null || $order->status !== 'pending_payment') {
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
            $client->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('warning').' این سفارش دیگر در انتظار پرداخت نیست.',
                [
                    'parse_mode' => 'HTML',
                    'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
                ],
            );

            return;
        }

        $c2cStatus = (string) data_get($order->customer_extra_data, 'card_to_card.status', '');
        if ($c2cStatus === 'waiting_for_receipt' && $this->isReceiptWindowExpired($order)) {
            $this->expireIfWaitingForReceipt($order->id);
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);

            return;
        }

        if (blank($bot->paymentReportsChatId())) {
            $this->cancelPendingOrder($order->id, 'payment_reports_missing');
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
            $client->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('warning')
                .' گروه گزارشات پرداخت هنوز تنظیم نشده است. سفارش شما لغو شد. لطفاً با پشتیبانی در تماس باشید.',
                [
                    'parse_mode' => 'HTML',
                    'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
                ],
            );

            return;
        }

        $fileId = $file['file_id'];
        $extra = (array) ($order->customer_extra_data ?? []);
        $existing = (array) ($extra['card_to_card'] ?? []);
        $extra['card_to_card'] = array_merge($existing, [
            'status' => 'awaiting_review',
            'receipt_file_id' => $fileId,
            'receipt_kind' => $file['kind'],
            'receipt_message_id' => (int) ($message['message_id'] ?? 0),
            'submitted_at' => now()->toIso8601String(),
            'submitter_telegram_user_id' => (int) $account->telegram_user_id,
            'submitter_telegram_account_id' => (int) $account->id,
            'approvals' => [],
            'required_approvals' => (int) ($existing['required_approvals'] ?? 2),
        ]);
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

        $ok = $this->paymentReports->notifyCardToCardReceipt(
            $bot,
            $order->fresh('product'),
            $fileId,
            $file['kind'],
            $account->adminDisplayName()
                ?: ($account->display_name ?: trim(($account->first_name ?? '').' '.($account->last_name ?? '')) ?: 'کاربر'),
            $account->mobile ?: ($order->customer_phone ?: '—'),
            (int) $account->telegram_user_id,
            0,
            2,
        );

        if (! $ok) {
            $this->cancelPendingOrder($order->id, 'payment_reports_notify_failed');
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
            $client->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('warning')
                .' ارسال رسید به گروه ادمین ناموفق بود. سفارش شما لغو شد. لطفاً دوباره تلاش کنید یا با پشتیبانی در تماس باشید.',
                [
                    'parse_mode' => 'HTML',
                    'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
                ],
            );

            return;
        }

        $client->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('check')." رسید سفارش #{$order->id} دریافت شد.\n"
            .TelegramCustomEmoji::tag('sparkles').' پس از تأیید دو ادمین، نتیجه همین‌جا اعلام می‌شود.',
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ],
        );
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
                $result = $this->approveOrder($bot, $client, $actor, $orderId, $chatId, $messageId);
                $client->answerCallbackQuery($callbackId, [
                    'text' => $result === 'completed' ? 'تأیید نهایی و تحویل شد' : 'تأیید ۱ از ۲ ثبت شد',
                ]);
            } else {
                $this->rejectOrder($bot, $client, $actor, $orderId, $chatId, $messageId);
                $client->answerCallbackQuery($callbackId, ['text' => 'رد شد — سفارش لغو شد']);
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

    /**
     * Expire C2C orders still waiting for a receipt (job + safety-net).
     */
    public function expireIfWaitingForReceipt(int $orderId): bool
    {
        $order = Order::query()->with('product')->find($orderId);
        if ($order === null || $order->status !== 'pending_payment' || $order->isPaid()) {
            return false;
        }

        $status = (string) data_get($order->customer_extra_data, 'card_to_card.status', '');
        if ($status !== 'waiting_for_receipt') {
            return false;
        }

        if (! $this->isReceiptWindowExpired($order)) {
            return false;
        }

        $this->cancelPendingOrder($order->id, 'receipt_timeout');

        $bot = $this->resolveBotForOrder($order);
        if ($bot !== null) {
            $buyer = $this->resolveBuyerAccount($bot, $order->fresh());
            if ($buyer !== null) {
                $conversation = $this->conversations->forAccount($buyer);
                if ($conversation->state === ConversationState::WaitingForCardToCardReceipt
                    || (int) data_get($conversation->context, 'checkout.order_id') === $order->id) {
                    $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
                }

                try {
                    $this->clients->forBot($bot)->sendMessage(
                        (int) $buyer->telegram_user_id,
                        TelegramCustomEmoji::tag('warning')
                        ." سفارش شما لغو شد.\n"
                        .'مهلت ۱۰ دقیقه‌ای ارسال رسید کارت‌به‌کارت به پایان رسید. در صورت تمایل دوباره خرید کنید.',
                        [
                            'parse_mode' => 'HTML',
                            'reply_markup' => $this->mainMenu->replyMarkup($buyer, $bot),
                        ],
                    );
                } catch (Throwable $e) {
                    Log::warning('card_to_card_expire_notify_failed', [
                        'order_id' => $order->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return true;
    }

    /**
     * Safety-net for scheduled expire command: cancel stale waiting_for_receipt C2C orders.
     *
     * @return int cancelled count
     */
    public function expireStaleWaitingReceiptOrders(): int
    {
        $cancelled = 0;

        Order::query()
            ->where('status', 'pending_payment')
            ->whereNull('paid_at')
            ->whereNotNull('customer_extra_data')
            ->orderBy('id')
            ->chunkById(100, function ($orders) use (&$cancelled): void {
                foreach ($orders as $order) {
                    $status = (string) data_get($order->customer_extra_data, 'card_to_card.status', '');
                    if ($status !== 'waiting_for_receipt') {
                        continue;
                    }
                    if (! $this->isReceiptWindowExpired($order)) {
                        continue;
                    }
                    if ($this->expireIfWaitingForReceipt((int) $order->id)) {
                        $cancelled++;
                    }
                }
            });

        return $cancelled;
    }

    /** @return 'partial'|'completed' */
    private function approveOrder(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        TelegramAccount $actor,
        int $orderId,
        int $adminChatId,
        int $adminMessageId,
    ): string {
        $outcome = 'partial';

        $order = DB::transaction(function () use ($orderId, $actor, &$outcome) {
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
            if (($c2c['status'] ?? '') !== 'awaiting_review') {
                throw new RuntimeException('هنوز رسیدی برای بررسی ثبت نشده است.');
            }

            $required = max(2, (int) ($c2c['required_approvals'] ?? 2));
            /** @var list<array{telegram_user_id: int, account_id: int, name: string, at: string}> $approvals */
            $approvals = array_values(array_filter(
                (array) ($c2c['approvals'] ?? []),
                static fn ($row) => is_array($row),
            ));

            foreach ($approvals as $row) {
                if ((int) ($row['telegram_user_id'] ?? 0) === (int) $actor->telegram_user_id) {
                    throw new RuntimeException('شما قبلاً این رسید را تأیید کرده‌اید. ادمین دیگری باید تأیید کند.');
                }
            }

            $reviewer = $actor->adminDisplayName() ?: ($actor->display_name ?: 'ادمین');
            $approvals[] = [
                'telegram_user_id' => (int) $actor->telegram_user_id,
                'account_id' => (int) $actor->id,
                'name' => $reviewer,
                'at' => now()->toIso8601String(),
            ];
            $c2c['approvals'] = $approvals;
            $c2c['required_approvals'] = $required;

            if (count($approvals) < $required) {
                $extra['card_to_card'] = $c2c;
                $order->update(['customer_extra_data' => $extra]);
                $outcome = 'partial';

                return $order->fresh('product');
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
                        'approvals' => $approvals,
                        'approved_at' => now()->toIso8601String(),
                    ],
                ],
            );

            $outcome = 'completed';

            return $order->fresh('product');
        });

        $approvals = (array) data_get($order->customer_extra_data, 'card_to_card.approvals', []);
        $required = max(2, (int) data_get($order->customer_extra_data, 'card_to_card.required_approvals', 2));
        $count = count($approvals);
        $names = collect($approvals)->pluck('name')->filter()->implode('، ');

        if ($outcome === 'partial') {
            $caption = TelegramCustomEmoji::tag('cash')." رسید کارت‌به‌کارت\n"
                ."سفارش #{$order->id}\n"
                .TelegramCustomEmoji::tag('check')." تأیید {$count}/{$required} توسط {$names}\n"
                .TelegramCustomEmoji::tag('warning').' منتظر تأیید ادمین دوم…';

            $this->updateAdminReviewMessage(
                $client,
                $adminChatId,
                $adminMessageId,
                $caption,
                $this->paymentReports->reviewKeyboard($order->id, $count, $required),
            );

            return 'partial';
        }

        $this->adminTelegram->notifyOrderPaid($order, 'card_to_card');
        $this->dispatchFulfillment($order->id);

        $this->updateAdminReviewMessage(
            $client,
            $adminChatId,
            $adminMessageId,
            TelegramCustomEmoji::tag('party')." تأیید {$required}/{$required} توسط {$names}\n"
            ."سفارش #{$order->id} پرداخت‌شده و در حال تحویل است.",
        );

        $this->notifyBuyer(
            $bot,
            $client,
            $order,
            TelegramCustomEmoji::tag('check')." پرداخت سفارش #{$order->id} تأیید شد.\n"
            .TelegramCustomEmoji::tag('sparkles').' دسترسی/لایسنس به‌زودی برایتان فعال می‌شود.',
        );

        return 'completed';
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
            $c2c['approvals'] = [];
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
                ->update(['status' => 'failed']);

            return $order->fresh('product');
        });

        $reviewer = $actor->adminDisplayName() ?: ($actor->display_name ?: 'ادمین');
        $this->updateAdminReviewMessage(
            $client,
            $adminChatId,
            $adminMessageId,
            TelegramCustomEmoji::tag('cross')." رد شد توسط {$reviewer}\n"
            ."سفارش #{$order->id} لغو شد و ظرفیت آزاد شد.",
        );

        $buyerAccount = $this->resolveBuyerAccount($bot, $order);
        if ($buyerAccount !== null) {
            $conversation = $this->conversations->forAccount($buyerAccount);
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
        }

        $this->notifyBuyer(
            $bot,
            $client,
            $order,
            TelegramCustomEmoji::tag('cross')." رسید سفارش #{$order->id} تأیید نشد و سفارش لغو شد.\n"
            .'در صورت تمایل می‌توانید دوباره خرید کنید.',
        );
    }

    private function isReceiptWindowExpired(Order $order): bool
    {
        $expiresAt = data_get($order->customer_extra_data, 'card_to_card.expires_at');
        if (filled($expiresAt)) {
            return ! Carbon::parse((string) $expiresAt)->isFuture();
        }

        $ttl = max(1, (int) config('bahram.orders.card_to_card_pending_ttl_minutes', 10));

        return $order->created_at !== null && $order->created_at->lte(now()->subMinutes($ttl));
    }

    private function resolveBotForOrder(Order $order): ?TelegramBot
    {
        $accountId = (int) data_get($order->customer_extra_data, 'card_to_card.submitter_telegram_account_id');
        if ($accountId > 0) {
            $account = TelegramAccount::query()->with('bot')->find($accountId);
            if ($account?->bot) {
                return $account->bot;
            }
        }

        return TelegramBot::query()->where('is_active', true)->orderBy('id')->first();
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
                'parse_mode' => 'HTML',
                'reply_markup' => $this->mainMenu->replyMarkup($buyer, $bot),
            ]);
        } catch (Throwable $e) {
            Log::warning('card_to_card_buyer_notify_failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>|null  $replyMarkup
     */
    private function updateAdminReviewMessage(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $resultLine,
        ?array $replyMarkup = null,
    ): void {
        $markup = $replyMarkup ?? ['inline_keyboard' => []];

        try {
            $client->editMessageCaption([
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'caption' => $resultLine,
                'parse_mode' => 'HTML',
                'reply_markup' => $markup,
            ]);
        } catch (Throwable) {
            try {
                $client->editMessageText($resultLine, [
                    'chat_id' => $chatId,
                    'message_id' => $messageId,
                    'parse_mode' => 'HTML',
                    'reply_markup' => $markup,
                ]);
            } catch (Throwable) {
                try {
                    $client->editMessageReplyMarkup([
                        'chat_id' => $chatId,
                        'message_id' => $messageId,
                        'reply_markup' => $markup,
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

    private function cancelPendingOrder(int $orderId, string $reason = 'cancelled'): void
    {
        $order = Order::query()->find($orderId);
        if ($order === null || $order->status !== 'pending_payment') {
            return;
        }

        $extra = (array) ($order->customer_extra_data ?? []);
        $c2c = (array) ($extra['card_to_card'] ?? []);
        $c2c['status'] = 'cancelled';
        $c2c['cancelled_at'] = now()->toIso8601String();
        $c2c['cancel_reason'] = $reason;
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
