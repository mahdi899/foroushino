<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\ResilientLiveClient;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/**
 * Host-owned card-to-card UX: instructions, receipt, deposit-group dual approve.
 * Iran is only called for order start / confirm / cancel.
 */
final class HostCardToCardFlow
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly ResilientLiveClient $live,
        private readonly ConversationRepository $conversations,
        private readonly AccountCache $accounts,
        private readonly MainMenu $mainMenu,
    ) {}

    public function sendLocalInstructions(
        int $chatId,
        int $telegramUserId,
        int $orderId,
        string $productTitle,
        int $amount,
        string $instructions,
        int $ttlMinutes = 15,
        int $productId = 0,
    ): void {
        $safeTitle = htmlspecialchars($productTitle, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $safeInstructions = htmlspecialchars($instructions, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $amountLabel = number_format($amount);
        $ttl = max(1, $ttlMinutes);

        $this->cache->rememberC2cOrderBuyer($orderId, $telegramUserId, $amount, $productTitle, $productId);
        $this->conversations->set($telegramUserId, 'waiting_for_card_to_card_receipt', [
            'checkout' => [
                'order_id' => $orderId,
                'product_id' => $productId,
                'amount' => $amount,
                'product_title' => $productTitle,
                'c2c_status' => 'waiting_for_receipt',
                'expires_at' => time() + ($ttl * 60),
                'approvals' => [],
                'required_approvals' => 2,
            ],
        ]);

        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('cash')." سفارش #{$orderId}\n"
            ."<b>{$safeTitle}</b>\n"
            .TelegramCustomEmoji::tag('coin')." مبلغ: <b>{$amountLabel}</b> تومان\n\n"
            .TelegramCustomEmoji::tag('money')." راهنمای کارت‌به‌کارت:\n{$safeInstructions}\n\n"
            .TelegramCustomEmoji::tag('warning')." مهلت ارسال رسید: <b>{$ttl} دقیقه</b>\n"
            .TelegramCustomEmoji::tag('pin')." حالا عکس واضح رسید واریز را همین‌جا ارسال کنید.\n"
            .'برای انصراف «لغو» را بفرستید.',
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ],
        );
    }

    /** @param array<string, mixed> $message */
    public function handleReceiptMessage(int $chatId, int $telegramUserId, array $message, string $text = ''): void
    {
        $conversation = $this->conversations->get($telegramUserId);
        $checkout = (array) ($conversation['context']['checkout'] ?? []);
        $orderId = (int) ($checkout['order_id'] ?? 0);

        if ($orderId <= 0) {
            $this->conversations->set($telegramUserId, 'idle', []);
            $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('warning').' سفارش کارت‌به‌کارت یافت نشد.', [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);

            return;
        }

        if (in_array(trim($text), ['لغو', '/cancel'], true)) {
            $this->cancelForUser($chatId, $telegramUserId, $orderId, 'user_cancel');

            return;
        }

        $expiresAt = (int) ($checkout['expires_at'] ?? 0);
        if ($expiresAt > 0 && time() >= $expiresAt && ($checkout['c2c_status'] ?? '') === 'waiting_for_receipt') {
            $this->expireWaitingReceipt($chatId, $telegramUserId, $orderId);

            return;
        }

        $file = $this->extractReceiptFile($message);
        if ($file === null) {
            $this->api->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('pin')." لطفاً فقط عکس رسید واریز را ارسال کنید.\nبرای انصراف «لغو» بفرستید.",
                ['parse_mode' => 'HTML'],
            );

            return;
        }

        $reportsChat = $this->cache->paymentReportsChatId();
        if ($reportsChat === null || $reportsChat === '') {
            $this->cancelForUser($chatId, $telegramUserId, $orderId, 'payment_reports_missing', 'گروه واریز تنظیم نشده است. سفارش لغو شد.');

            return;
        }

        $meta = $this->cache->c2cOrderMeta($orderId);
        $amountValue = (int) ($checkout['amount'] ?? $meta['amount'] ?? 0);
        $productTitle = (string) ($checkout['product_title'] ?? $meta['product_title'] ?? '—');
        $buyerRow = $this->accounts->get($telegramUserId);
        $buyerName = trim((string) ($buyerRow['display_name'] ?? '')) ?: 'کاربر';
        $mobile = trim((string) ($buyerRow['mobile'] ?? ''));
        if ($mobile === '') {
            $mobile = '—';
        }
        $username = trim((string) ($message['from']['username'] ?? ''));
        $username = ltrim($username, '@');

        $amount = number_format($amountValue);
        $product = htmlspecialchars($productTitle, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $safeName = htmlspecialchars($buyerName, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $safeMobile = htmlspecialchars($mobile, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $tgLink = '<a href="tg://user?id='.$telegramUserId.'">'.$telegramUserId.'</a>';

        $caption = TelegramCustomEmoji::tag('cash')." رسید کارت‌به‌کارت\n"
            ."────────────────\n"
            ."سفارش #{$orderId}\n"
            ."محصول: {$product}\n"
            .TelegramCustomEmoji::tag('coin')." مبلغ: <b>{$amount}</b> تومان\n"
            ."نام: {$safeName}\n"
            ."موبایل: {$safeMobile}\n"
            ."تلگرام: {$tgLink}";
        if ($username !== '') {
            $safeUser = htmlspecialchars($username, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $caption .= "\nیوزرنیم: <a href=\"https://t.me/{$safeUser}\">@{$safeUser}</a>";
        }

        $keyboard = [
            'inline_keyboard' => [[
                InlineButtons::callback('تأیید (0/2)', 'c2c:ok:'.$orderId, 'check', 'success'),
                InlineButtons::callback('رد', 'c2c:no:'.$orderId, 'cross', 'danger'),
            ]],
        ];

        try {
            if ($file['kind'] === 'document') {
                $this->api->sendDocument($reportsChat, $file['file_id'], $caption, [
                    'reply_markup' => $keyboard,
                ]);
            } else {
                $this->api->sendPhoto($reportsChat, $file['file_id'], $caption, [
                    'reply_markup' => $keyboard,
                ]);
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] c2c group notify failed: '.$e->getMessage());
            $this->cancelForUser(
                $chatId,
                $telegramUserId,
                $orderId,
                'payment_reports_notify_failed',
                'ارسال رسید به گروه ادمین ناموفق بود. سفارش لغو شد.',
            );

            return;
        }

        $checkout['c2c_status'] = 'awaiting_review';
        $checkout['amount'] = $amountValue;
        $checkout['product_title'] = $productTitle;
        $checkout['receipt_file_id'] = $file['file_id'];
        $checkout['receipt_kind'] = $file['kind'];
        $checkout['approvals'] = [];
        $checkout['required_approvals'] = 2;
        $checkout['buyer_telegram_user_id'] = $telegramUserId;

        $this->conversations->set($telegramUserId, 'idle', [
            'checkout' => $checkout,
            'c2c_review' => $checkout,
        ]);

        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('check')." رسید سفارش #{$orderId} دریافت شد.",
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ],
        );
    }

    public function handleAdminCallback(
        int $chatId,
        int $messageId,
        int $actorTelegramUserId,
        string $callbackId,
        string $data,
    ): void {
        if (! $this->accounts->isBotAdmin($actorTelegramUserId)) {
            $this->api->answerCallbackQuery($callbackId, 'فقط ادمین بات می‌تواند بررسی کند.', true);

            return;
        }

        $approve = str_starts_with($data, 'c2c:ok:');
        $orderId = (int) substr($data, strlen($approve ? 'c2c:ok:' : 'c2c:no:'));
        if ($orderId <= 0) {
            $this->api->answerCallbackQuery($callbackId, 'سفارش نامعتبر', true);

            return;
        }

        $buyerId = $this->cache->c2cOrderBuyer($orderId);
        if ($buyerId <= 0) {
            $this->api->answerCallbackQuery($callbackId, 'سفارش در حافظه هاست یافت نشد', true);

            return;
        }

        $conversation = $this->conversations->get($buyerId);
        $review = (array) ($conversation['context']['c2c_review'] ?? $conversation['context']['checkout'] ?? []);
        if ((int) ($review['order_id'] ?? 0) !== $orderId) {
            $this->api->answerCallbackQuery($callbackId, 'این سفارش دیگر در انتظار بررسی نیست', true);

            return;
        }

        if (! $approve) {
            $productId = (int) ($review['product_id'] ?? 0);
            if ($productId <= 0) {
                $productId = (int) ($this->cache->c2cOrderMeta($orderId)['product_id'] ?? 0);
            }
            $this->live->checkoutC2cCancel($chatId, $actorTelegramUserId, $orderId, 'admin_reject');
            $this->conversations->set($buyerId, 'idle', []);
            $this->editGroupResult($chatId, $messageId, TelegramCustomEmoji::tag('cross')." رد شد — سفارش #{$orderId} لغو شد.");
            $this->api->answerCallbackQuery($callbackId, 'رد شد — سفارش لغو شد');

            $params = ['parse_mode' => 'HTML'];
            if ($productId > 0) {
                $params['reply_markup'] = [
                    'inline_keyboard' => [[
                        InlineButtons::callback('خرید مجدد', 'buy:'.$productId, 'cart', 'success'),
                    ]],
                ];
            }

            $this->api->sendMessage(
                $buyerId,
                TelegramCustomEmoji::tag('cross')." رسید سفارش #{$orderId} تأیید نشد و سفارش لغو شد.",
                $params,
            );

            return;
        }

        /** @var list<array{telegram_user_id: int, name: string, at: string}> $approvals */
        $approvals = array_values(array_filter(
            (array) ($review['approvals'] ?? []),
            static fn ($row) => is_array($row),
        ));
        foreach ($approvals as $row) {
            if ((int) ($row['telegram_user_id'] ?? 0) === $actorTelegramUserId) {
                $this->api->answerCallbackQuery($callbackId, 'شما قبلاً تأیید کرده‌اید. ادمین دیگری لازم است.', true);

                return;
            }
        }

        $actorRow = $this->accounts->get($actorTelegramUserId);
        $name = trim((string) ($actorRow['display_name'] ?? '')) ?: 'ادمین';
        $approvals[] = [
            'telegram_user_id' => $actorTelegramUserId,
            'name' => $name,
            'at' => gmdate('c'),
        ];
        $required = max(2, (int) ($review['required_approvals'] ?? 2));
        $review['approvals'] = $approvals;

        if (count($approvals) < $required) {
            $this->conversations->set($buyerId, 'idle', [
                'checkout' => $review,
                'c2c_review' => $review,
            ]);
            $names = implode('، ', array_map(static fn ($a) => (string) ($a['name'] ?? ''), $approvals));
            $count = count($approvals);
            $this->editGroupResult(
                $chatId,
                $messageId,
                TelegramCustomEmoji::tag('check')." تأیید {$count}/{$required} توسط {$names}\n".TelegramCustomEmoji::tag('warning').' منتظر ادمین دوم…',
                [
                    'inline_keyboard' => [[
                        InlineButtons::callback("تأیید ({$count}/{$required})", 'c2c:ok:'.$orderId, 'check', 'success'),
                        InlineButtons::callback('رد', 'c2c:no:'.$orderId, 'cross', 'danger'),
                    ]],
                ],
            );
            $this->api->answerCallbackQuery($callbackId, "تأیید {$count} از {$required} ثبت شد");

            return;
        }

        $result = $this->live->checkoutC2cConfirm($chatId, $actorTelegramUserId, $orderId, $approvals);
        if (! empty($result['offline']) || empty($result['ok'])) {
            $this->api->answerCallbackQuery($callbackId, (string) ($result['message'] ?? 'تأیید روی سرور ناموفق بود'), true);

            return;
        }

        $this->conversations->set($buyerId, 'idle', []);
        $names = implode('، ', array_map(static fn ($a) => (string) ($a['name'] ?? ''), $approvals));
        $this->editGroupResult(
            $chatId,
            $messageId,
            TelegramCustomEmoji::tag('party')." تأیید {$required}/{$required} توسط {$names}\nسفارش #{$orderId} پرداخت‌شده و در حال تحویل است.",
        );
        $this->api->answerCallbackQuery($callbackId, 'تأیید نهایی و تحویل شد');
        $this->api->sendMessage(
            $buyerId,
            $this->cache->renderMessage(
                'c2c_payment_confirmed',
                ['order_id' => (string) $orderId],
                TelegramCustomEmoji::tag('check')." پرداخت سفارش #{$orderId} تأیید شد.\n"
                .TelegramCustomEmoji::tag('sparkles').' دسترسی/لایسنس به‌زودی در پنل فعال می‌شود.',
            ),
            ['reply_markup' => $this->mainMenu->replyMarkup($buyerId), 'parse_mode' => 'HTML'],
        );
    }

    public function expireWaitingReceipt(int $chatId, int $telegramUserId, int $orderId): void
    {
        $this->live->checkoutC2cCancel($chatId, $telegramUserId, $orderId, 'receipt_timeout');
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage(
            $chatId > 0 ? $chatId : $telegramUserId,
            TelegramCustomEmoji::tag('warning')
            ." سفارش شما لغو شد.\nمهلت ارسال رسید کارت‌به‌کارت به پایان رسید. در صورت تمایل دوباره خرید کنید.",
            ['reply_markup' => $this->mainMenu->replyMarkup($telegramUserId)],
        );
    }

    public function cancelForUser(
        int $chatId,
        int $telegramUserId,
        int $orderId,
        string $reason,
        string $userMessage = 'سفارش شما لغو شد.',
    ): void {
        $this->live->checkoutC2cCancel($chatId, $telegramUserId, $orderId, $reason);
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('warning').' '.$userMessage,
            ['reply_markup' => $this->mainMenu->replyMarkup($telegramUserId)],
        );
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

    /** @param array<string, mixed>|null $replyMarkup */
    private function editGroupResult(int $chatId, int $messageId, string $caption, ?array $replyMarkup = null): void
    {
        $markup = $replyMarkup ?? ['inline_keyboard' => []];
        try {
            $this->api->editMessageCaption($chatId, $messageId, $caption, [
                'reply_markup' => $markup,
            ]);
        } catch (\Throwable) {
            try {
                $this->api->editMessageText($chatId, $messageId, $caption, [
                    'reply_markup' => $markup,
                ]);
            } catch (\Throwable) {
                $this->api->editMessageReplyMarkup($chatId, $messageId, $markup);
            }
        }
    }
}
