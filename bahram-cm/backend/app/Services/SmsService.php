<?php

namespace App\Services;

use App\Enums\SmsEventKey;
use App\Jobs\SmsFallbackJob;
use App\Models\Order;
use App\Models\SmsEventConfig;
use App\Models\SmsLog;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Sms\SmsProviderFactory;
use Illuminate\Support\Facades\Log;

/**
 * Event-driven SMS gateway with multi-provider support and optional fallback.
 */
class SmsService
{
    public function __construct(private readonly SmsProviderFactory $providers) {}

    public function sendPurchaseConfirmation(Order $order): bool
    {
        $order->loadMissing('product');

        return $this->sendEvent(SmsEventKey::PurchaseConfirmation, $order->customer_phone, [
            '{name}' => $order->customer_name,
            '{phone}' => $order->customer_phone,
            '{order_number}' => $order->order_number,
            '{product_title}' => $order->product?->title ?? '-',
            '{code}' => $order->spotplayer_license_code ?: '-',
        ], $order->user_id);
    }

    public function sendLicenseCreated(Order $order): bool
    {
        if (blank($order->spotplayer_license_code)) {
            return false;
        }

        $order->loadMissing('product');

        return $this->sendEvent(SmsEventKey::LicenseCreated, $order->customer_phone, [
            '{name}' => $order->customer_name,
            '{product_title}' => $order->product?->title ?? '-',
            '{code}' => $order->spotplayer_license_code,
            '{order_number}' => $order->order_number,
        ], $order->user_id);
    }

    public function sendOtp(string $mobile, string $code): bool
    {
        $smsSent = $this->sendEvent(SmsEventKey::Otp, $mobile, ['{code}' => $code], null);
        $baleSent = $this->sendOtpViaBaleSafir($mobile, $code);

        return $smsSent || $baleSent;
    }

    public function sendWelcome(User $user): bool
    {
        $name = $user->name ?: 'دانشجو';

        return $this->sendEvent(SmsEventKey::Welcome, $user->mobile, ['{name}' => $name], $user->id);
    }

    public function sendTicketCreated(Ticket $ticket): bool
    {
        $ticket->loadMissing('user');
        $user = $ticket->user;

        if (! $user?->mobile) {
            return false;
        }

        return $this->sendEvent(SmsEventKey::TicketCreated, $user->mobile, [
            '{name}' => $user->name ?: 'دانشجو',
            '{subject}' => $ticket->subject,
            '{ticket_id}' => (string) $ticket->id,
        ], $user->id);
    }

    public function sendTicketReply(Ticket $ticket): bool
    {
        $ticket->loadMissing('user');
        $user = $ticket->user;

        if (! $user?->mobile) {
            return false;
        }

        return $this->sendEvent(SmsEventKey::TicketReply, $user->mobile, [
            '{name}' => $user->name ?: 'دانشجو',
            '{subject}' => $ticket->subject,
            '{ticket_id}' => (string) $ticket->id,
        ], $user->id);
    }

    public function sendToMobile(string $mobile, string $message, ?int $userId = null): bool
    {
        return $this->sendEvent(SmsEventKey::Broadcast, $mobile, ['{message}' => $message], $userId);
    }

    /**
     * @return array{success: bool, message: string}
     */
    public function sendTest(string $phone): array
    {
        $settings = SmsSetting::current();

        if (! $settings->is_sms_active) {
            return ['success' => false, 'message' => 'سرویس پیامک غیرفعال است.'];
        }

        $slug = $settings->primary_provider_slug ?? $settings->sms_provider ?? 'melipayamak';
        $provider = $this->providers->make($slug);

        if (! $provider) {
            return ['success' => false, 'message' => 'پنل پیامکی اصلی تنظیم نشده است.'];
        }

        $log = $this->dispatchWithProvider(
            $phone,
            'این یک پیامک آزمایشی از پنل مدیریت بهرام است.',
            $slug,
            null,
            'test',
            null,
            false,
        );

        return [
            'success' => $log->status === 'sent',
            'message' => $log->status === 'sent' ? 'پیامک آزمایشی با موفقیت ارسال شد.' : 'ارسال پیامک آزمایشی ناموفق بود. لاگ‌های سرویس پیامک را بررسی کنید.',
        ];
    }

    /**
     * @param  array<string, string>  $variables
     */
    public function sendEvent(SmsEventKey $eventKey, string $mobile, array $variables, ?int $userId): bool
    {
        $settings = SmsSetting::current();
        $event = SmsEventConfig::forKey($eventKey);

        if (! $settings->is_sms_active) {
            Log::channel('sms')->warning('SMS skipped: service inactive.', ['event' => $eventKey->value, 'mobile' => $mobile]);

            return false;
        }

        if ($event && ! $event->is_enabled) {
            Log::channel('sms')->info('SMS skipped: event disabled.', ['event' => $eventKey->value, 'mobile' => $mobile]);

            return false;
        }

        $template = $event?->resolvedTemplate() ?? $eventKey->defaultTemplate();
        $message = strtr($template, $variables);
        $providerSlug = $event?->provider_slug
            ?: $settings->primary_provider_slug
            ?: $settings->sms_provider
            ?: 'melipayamak';

        $patternCode = ($event?->use_pattern && filled($event->pattern_code)) ? $event->pattern_code : null;

        $log = $this->dispatchWithProvider(
            $mobile,
            $message,
            $providerSlug,
            $userId,
            $eventKey->value,
            $patternCode,
            false,
        );

        $this->scheduleFallbackIfNeeded($settings, $event, $log);

        return $log->status === 'sent';
    }

    public function sendFallbackForLog(SmsLog $primary): bool
    {
        $settings = SmsSetting::current();

        if (! $settings->is_sms_active || ! $settings->fallback_enabled) {
            return false;
        }

        $fallbackSlug = $settings->fallback_provider_slug;

        if (blank($fallbackSlug) || $fallbackSlug === $primary->provider) {
            return false;
        }

        $log = $this->dispatchWithProvider(
            $primary->mobile,
            $primary->message,
            $fallbackSlug,
            $primary->user_id,
            $primary->event_key,
            null,
            true,
            $primary->id,
        );

        return $log->status === 'sent';
    }

    public function sendOtpViaBaleSafir(string $mobile, string $code): bool
    {
        $provider = SmsProvider::query()->where('slug', 'bale_safir')->first();

        if (! $provider?->isReady()) {
            return false;
        }

        $event = SmsEventConfig::forKey(SmsEventKey::Otp);
        $template = $event?->resolvedTemplate() ?? SmsEventKey::Otp->defaultTemplate();
        $message = strtr($template, ['{code}' => $code]);

        $log = $this->dispatchWithProvider(
            $mobile,
            $message,
            'bale_safir',
            null,
            SmsEventKey::Otp->value,
            null,
            false,
        );

        return $log->status === 'sent';
    }

    private function scheduleFallbackIfNeeded(SmsSetting $settings, ?SmsEventConfig $event, SmsLog $log): void
    {
        $eventFallback = $event?->fallback_enabled ?? false;
        $globalFallback = $settings->fallback_enabled && filled($settings->fallback_provider_slug);

        if (! $eventFallback && ! ($globalFallback && $log->status !== 'sent')) {
            return;
        }

        if ($settings->fallback_provider_slug === $log->provider) {
            return;
        }

        if (! SmsProvider::query()->where('slug', $settings->fallback_provider_slug)->where('is_active', true)->exists()
            && ! $this->providers->make((string) $settings->fallback_provider_slug)) {
            return;
        }

        $delay = $event?->fallback_delay_seconds
            ?? $settings->fallback_delay_seconds
            ?? 20;

        SmsFallbackJob::dispatch($log->id)->delay(now()->addSeconds(max(5, (int) $delay)));
    }

    private function dispatchWithProvider(
        string $mobile,
        string $message,
        string $providerSlug,
        ?int $userId,
        ?string $eventKey,
        ?string $patternCode,
        bool $isFallback,
        ?int $fallbackOfLogId = null,
    ): SmsLog {
        $log = SmsLog::create([
            'user_id' => $userId,
            'event_key' => $eventKey,
            'fallback_of_log_id' => $fallbackOfLogId,
            'is_fallback_attempt' => $isFallback,
            'mobile' => $mobile,
            'message' => $message,
            'provider' => $providerSlug,
            'status' => 'pending',
        ]);

        $provider = $this->providers->make($providerSlug, $patternCode);

        if (! $provider) {
            $log->update(['status' => 'failed']);

            return $log->fresh();
        }

        $result = $provider->send($mobile, $message);

        $log->update([
            'status' => $result['success'] ? 'sent' : 'failed',
            'sent_at' => $result['success'] ? now() : null,
            'raw_response' => is_array($result['raw'] ?? null) ? $result['raw'] : null,
        ]);

        if ($result['success']) {
            Log::channel('sms')->info('SMS sent.', ['mobile' => $mobile, 'provider' => $providerSlug, 'event' => $eventKey]);
        } else {
            Log::channel('sms')->error('SMS failed.', ['mobile' => $mobile, 'provider' => $providerSlug, 'event' => $eventKey, 'message' => $result['message']]);
        }

        return $log->fresh();
    }
}
