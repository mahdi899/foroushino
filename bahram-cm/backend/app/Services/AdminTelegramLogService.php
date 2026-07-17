<?php

namespace App\Services;

use App\Enums\AdminTelegramEventKey;
use App\Jobs\SendAdminTelegramLogJob;
use App\Models\AdminTelegramEventConfig;
use App\Models\Order;
use App\Models\SatApplication;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Models\Ticket;
use App\Models\User;
use App\Support\JalaliDate;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends structured admin activity logs to Telegram chat(s) via the configured bot.
 */
class AdminTelegramLogService
{
    /** @param  array<string, mixed>  $context */
    public function notify(AdminTelegramEventKey $eventKey, array $context = []): void
    {
        if (! $this->isGloballyEnabled()) {
            return;
        }

        $event = AdminTelegramEventConfig::forKey($eventKey);
        if ($event && ! $event->is_enabled) {
            return;
        }

        // Run after the HTTP response so admins get logs without requiring a queue worker.
        SendAdminTelegramLogJob::dispatch($eventKey, $context)->afterResponse();
    }

    /** @param  array<string, mixed>  $context */
    public function sendNow(AdminTelegramEventKey $eventKey, array $context = []): bool
    {
        if (! $this->isGloballyEnabled()) {
            return false;
        }

        $event = AdminTelegramEventConfig::forKey($eventKey);
        if ($event && ! $event->is_enabled) {
            return false;
        }

        $context = $this->resolveContext($context);

        $token = $this->botToken();
        $chatIds = $this->chatIds();

        if ($token === null || $chatIds === []) {
            Log::channel('sms')->warning('Admin Telegram log skipped: bot or chat IDs not configured.', [
                'event' => $eventKey->value,
            ]);

            return false;
        }

        $message = $this->buildMessage($eventKey, $context);
        $sentAny = false;

        foreach ($chatIds as $chatId) {
            if ($this->telegramClient()->sendMessage($chatId, $message)) {
                $sentAny = true;
            }
        }

        return $sentAny;
    }

    /** @return array{success: bool, message: string} */
    public function sendTest(): array
    {
        $token = $this->botToken();
        $chatIds = $this->chatIds();

        if ($token === null) {
            return ['success' => false, 'message' => 'توکن ربات تلگرام تنظیم نشده است.'];
        }

        if ($chatIds === []) {
            return ['success' => false, 'message' => 'شناسه چت ادمین تنظیم نشده است.'];
        }

        $message = "پیام سفارشی هست از تیم توسعه‌دهنده 💖💖💖\n\n"
            .'<i>'.JalaliDate::format().'</i>';

        $sent = false;
        foreach ($chatIds as $chatId) {
            $sent = $this->telegramClient()->sendMessage($chatId, $message) || $sent;
        }

        return $sent
            ? ['success' => true, 'message' => 'پیام آزمایشی به '.count($chatIds).' چت ارسال شد.']
            : ['success' => false, 'message' => 'ارسال پیام آزمایشی ناموفق بود.'];
    }

    /**
     * Sends the admin OTP code directly to all configured Telegram chat IDs.
     * This method bypasses the global-enabled flag and event toggles intentionally,
     * because OTP delivery is security-critical and must work even when event
     * notifications are turned off.
     */
    public function sendAdminLoginOtp(string $mobile, string $code): bool
    {
        $token = $this->botToken();
        $chatIds = $this->chatIds();

        if ($token === null || $chatIds === []) {
            Log::channel('sms')->warning('Admin OTP Telegram fallback skipped: bot or chat IDs not configured.');

            return false;
        }

        $maskedMobile = mb_substr($mobile, 0, -4).'****';

        $message = "🔐 <b>کد ورود ادمین</b>\n\n"
            .'<b>شماره:</b> <code>'.$this->escape($maskedMobile)."</code>\n"
            .'<b>کد OTP:</b> <code>'.$this->escape($code)."</code>\n\n"
            ."<i>این کد ۲ دقیقه اعتبار دارد.</i>\n"
            ."⚠️ <b>این کد را با کسی به اشتراک نگذارید.</b>\n\n"
            .'<i>'.\App\Support\JalaliDate::format().'</i>';

        $sentAny = false;
        foreach ($chatIds as $chatId) {
            if ($this->telegramClient()->sendMessage($chatId, $message)) {
                $sentAny = true;
            }
        }

        if (! $sentAny) {
            Log::channel('sms')->error('Admin OTP Telegram fallback failed for all chat IDs.', [
                'mobile_masked' => $maskedMobile,
            ]);
        }

        return $sentAny;
    }

    public function notifyOrderCreated(Order $order): void
    {
        $this->notify(AdminTelegramEventKey::OrderCreated, ['order_id' => $order->id]);
    }

    public function notifyPaymentStarted(Order $order): void
    {
        $this->notify(AdminTelegramEventKey::PaymentStarted, ['order_id' => $order->id]);
    }

    public function notifyOrderPaid(Order $order, ?string $refId = null): void
    {
        $this->notify(AdminTelegramEventKey::OrderPaid, ['order_id' => $order->id, 'ref_id' => $refId]);

        try {
            $gateway = null;
            if (is_string($refId) && in_array($refId, ['card_to_card', 'c2c'], true)) {
                $gateway = 'card_to_card';
                $refId = null;
            }
            app(\App\Modules\TelegramBot\Services\TelegramPaymentReportsNotifier::class)
                ->notifyOrderPaid($order, $gateway, is_string($refId) ? $refId : null);
        } catch (Throwable $e) {
            Log::warning('payment_reports_notify_order_paid_failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function notifyOrderFulfilled(Order $order): void
    {
        $this->notify(AdminTelegramEventKey::OrderFulfilled, ['order_id' => $order->id]);
    }

    public function notifyPaymentCancelled(Order $order): void
    {
        $this->notify(AdminTelegramEventKey::PaymentCancelled, ['order_id' => $order->id]);
    }

    public function notifyPaymentFailed(Order $order, ?string $reason = null): void
    {
        $this->notify(AdminTelegramEventKey::PaymentFailed, ['order_id' => $order->id, 'reason' => $reason]);
    }

    /** @param  array<string, mixed>  $changes */
    public function notifyOrderUpdated(Order $order, array $changes): void
    {
        $this->notify(AdminTelegramEventKey::OrderUpdated, ['order_id' => $order->id, 'changes' => $changes]);
    }

    public function notifyLicenseIssued(Order $order): void
    {
        $this->notify(AdminTelegramEventKey::LicenseIssued, ['order_id' => $order->id]);
    }

    public function notifyProfileCompleted(Order $order): void
    {
        $this->notify(AdminTelegramEventKey::ProfileCompleted, ['order_id' => $order->id]);
    }

    public function notifyTicketCreated(Ticket $ticket): void
    {
        $ticket->loadMissing(['user', 'messages']);
        $this->notify(AdminTelegramEventKey::TicketCreated, [
            'ticket_id' => $ticket->id,
            'message' => $ticket->messages->first()?->message,
        ]);
    }

    public function notifyTicketStudentReply(Ticket $ticket, string $message): void
    {
        $this->notify(AdminTelegramEventKey::TicketStudentReply, [
            'ticket_id' => $ticket->id,
            'message' => $message,
        ]);
    }

    public function notifyTicketAdminReply(Ticket $ticket, string $message): void
    {
        $this->notify(AdminTelegramEventKey::TicketAdminReply, [
            'ticket_id' => $ticket->id,
            'message' => $message,
        ]);
    }

    public function notifyStudentRegistered(User $user): void
    {
        $this->notify(AdminTelegramEventKey::StudentRegistered, ['user_id' => $user->id]);
    }

    public function notifyStudentFirstLogin(User $user): void
    {
        $this->notify(AdminTelegramEventKey::StudentFirstLogin, ['user_id' => $user->id]);
    }

    public function notifyProfileUpdated(User $user): void
    {
        $this->notify(AdminTelegramEventKey::ProfileUpdated, ['user_id' => $user->id]);
    }

    public function notifySatApplicationSubmitted(SatApplication $application): void
    {
        $this->notify(AdminTelegramEventKey::SatApplicationSubmitted, ['application_id' => $application->id]);
    }

    /** @param  array<string, mixed>  $context */
    private function resolveContext(array $context): array
    {
        if (! isset($context['order']) && isset($context['order_id'])) {
            $context['order'] = Order::query()->with('product')->find($context['order_id']);
        }

        if (! isset($context['ticket']) && isset($context['ticket_id'])) {
            $context['ticket'] = Ticket::query()->with('user')->find($context['ticket_id']);
        }

        if (! isset($context['user']) && isset($context['user_id'])) {
            $context['user'] = User::query()->with('profile')->find($context['user_id']);
        }

        if (! isset($context['application']) && isset($context['application_id'])) {
            $context['application'] = SatApplication::query()->with('user')->find($context['application_id']);
        }

        return $context;
    }

    /** @param  array<string, mixed>  $context */
    private function buildMessage(AdminTelegramEventKey $eventKey, array $context): string
    {
        $lines = [
            '<b>'.$eventKey->emoji().' '.$this->escape($eventKey->label()).'</b>',
        ];

        $lines[] = '';

        $body = match ($eventKey) {
            AdminTelegramEventKey::OrderCreated,
            AdminTelegramEventKey::PaymentStarted,
            AdminTelegramEventKey::OrderPaid,
            AdminTelegramEventKey::OrderFulfilled,
            AdminTelegramEventKey::PaymentCancelled,
            AdminTelegramEventKey::PaymentFailed,
            AdminTelegramEventKey::LicenseIssued,
            AdminTelegramEventKey::ProfileCompleted => $this->orderLines($context['order'] ?? null, $context),
            AdminTelegramEventKey::OrderUpdated => $this->orderUpdatedLines($context['order'] ?? null, $context['changes'] ?? []),
            AdminTelegramEventKey::TicketCreated,
            AdminTelegramEventKey::TicketStudentReply,
            AdminTelegramEventKey::TicketAdminReply => $this->ticketLines($context['ticket'] ?? null, $context),
            AdminTelegramEventKey::StudentRegistered,
            AdminTelegramEventKey::StudentFirstLogin,
            AdminTelegramEventKey::ProfileUpdated => $this->userLines($context['user'] ?? null),
            AdminTelegramEventKey::SatApplicationSubmitted => $this->satLines($context['application'] ?? null),
        };

        $lines = array_merge($lines, $body);

        $lines[] = '';
        $lines[] = '<i>'.JalaliDate::format().'</i>';

        return implode("\n", array_filter($lines, fn ($line) => $line !== null));
    }

    /** @param  array<string, mixed>  $context */
    private function orderLines(?Order $order, array $context): array
    {
        if (! $order) {
            return ['<i>اطلاعات سفارش در دسترس نیست.</i>'];
        }

        $lines = [
            $this->field('شماره سفارش', $order->order_number),
            $this->field('محصول', $order->product?->title ?? '—'),
            $this->field('مبلغ', $this->formatToman($order->final_amount)),
            $this->field('مشتری', $order->customer_name),
            $this->field('موبایل', $order->customer_phone, true),
        ];

        if (filled($order->customer_email)) {
            $lines[] = $this->field('ایمیل', $order->customer_email);
        }

        if (filled($order->referral_code)) {
            $lines[] = $this->field('کد معرف', $order->referral_code, true);
        }

        $lines[] = $this->field('وضعیت', $order->status.' / '.$order->payment_status, true);

        if (! empty($context['ref_id'])) {
            $lines[] = $this->field('کد پیگیری', (string) $context['ref_id'], true);
        }

        if (! empty($context['reason'])) {
            $lines[] = $this->field('علت', (string) $context['reason']);
        }

        if (filled($order->spotplayer_license_code)) {
            $lines[] = $this->field('لایسنس', $order->spotplayer_license_code, true);
        }

        return $lines;
    }

    /** @param  array<string, mixed>  $changes */
    private function orderUpdatedLines(?Order $order, array $changes): array
    {
        $lines = $this->orderLines($order, []);

        if ($changes !== []) {
            $lines[] = '';
            $lines[] = '<b>تغییرات:</b>';
            foreach ($changes as $field => $value) {
                $lines[] = $this->field((string) $field, is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE), true);
            }
        }

        return $lines;
    }

    /** @param  array<string, mixed>  $context */
    private function ticketLines(?Ticket $ticket, array $context): array
    {
        if (! $ticket) {
            return ['<i>اطلاعات تیکت در دسترس نیست.</i>'];
        }

        $user = $ticket->user;
        $lines = [
            $this->field('شناسه', (string) $ticket->id, true),
            $this->field('موضوع', $ticket->subject),
            $this->field('دپارتمان', $ticket->department ?? '—'),
            $this->field('اولویت', $ticket->priority->value ?? (string) $ticket->priority),
            $this->field('وضعیت', $ticket->status->value ?? (string) $ticket->status, true),
        ];

        if ($user) {
            $lines[] = $this->field('دانشجو', $user->name ?: '—');
            $lines[] = $this->field('موبایل', $user->mobile ?? '—', true);
        }

        if (! empty($context['message'])) {
            $lines[] = '';
            $lines[] = '<b>متن پیام:</b>';
            $lines[] = $this->escape($this->truncate((string) $context['message'], 500));
        }

        return $lines;
    }

    private function userLines(?User $user): array
    {
        if (! $user) {
            return ['<i>اطلاعات کاربر در دسترس نیست.</i>'];
        }

        $profile = $user->profile;
        $lines = [
            $this->field('نام', $user->name ?: '—'),
            $this->field('موبایل', $user->mobile ?? '—', true),
        ];

        if ($profile) {
            $fullName = trim(implode(' ', array_filter([$profile->first_name, $profile->last_name])));
            if ($fullName !== '') {
                $lines[] = $this->field('نام کامل', $fullName);
            }
            if (filled($profile->email)) {
                $lines[] = $this->field('ایمیل', $profile->email);
            }
            if (filled($profile->city)) {
                $lines[] = $this->field('شهر', $profile->city);
            }
        }

        return $lines;
    }

    private function satLines(?SatApplication $application): array
    {
        if (! $application) {
            return ['<i>اطلاعات درخواست در دسترس نیست.</i>'];
        }

        return [
            $this->field('نام', $application->name),
            $this->field('موبایل', $application->mobile ?? '—', true),
            $this->field('شهر', $application->city ?? '—'),
            $this->field('سن', $application->age !== null ? (string) $application->age : '—', true),
            $this->field('وضعیت', $application->status->value ?? (string) $application->status, true),
        ];
    }

    private function field(string $label, ?string $value, bool $ltr = false): string
    {
        $safeValue = $this->escape($value ?? '—');

        if ($ltr) {
            $safeValue = '<code>'.$safeValue.'</code>';
        }

        return '<b>'.$this->escape($label).':</b> '.$safeValue;
    }

    private function formatToman(int $amount): string
    {
        return number_format($amount).' تومان';
    }

    private function escape(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function truncate(string $value, int $max): string
    {
        if (mb_strlen($value) <= $max) {
            return $value;
        }

        return mb_substr($value, 0, $max - 1).'…';
    }

    private function isGloballyEnabled(): bool
    {
        return (bool) SmsSetting::current()->admin_telegram_enabled;
    }

    private function botToken(): ?string
    {
        $provider = SmsProvider::query()->where('slug', 'telegram')->first();
        $token = trim((string) $provider?->credentials);

        return $token !== '' ? $token : null;
    }

    /** @return list<string> */
    private function chatIds(): array
    {
        $raw = (string) SmsSetting::current()->admin_telegram_chat_ids;
        $parts = preg_split('/[\s,;]+/', $raw) ?: [];

        return array_values(array_filter(array_map('trim', $parts), fn ($id) => $id !== ''));
    }

    private function telegramClient(): TelegramBotClient
    {
        return TelegramBotClient::fromAdminConfig();
    }
}
