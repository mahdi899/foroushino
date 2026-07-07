<?php

namespace App\Services;

use App\Contracts\SmsProviderContract;
use App\Models\Order;
use App\Models\SmsLog;
use App\Models\SmsSetting;
use App\Models\User;
use App\Services\Sms\KavenegarProvider;
use App\Services\Sms\MelipayamakProvider;
use Illuminate\Support\Facades\Log;

/**
 * Provider-agnostic SMS gateway. Every outbound message (purchase
 * confirmations, OTP codes, welcome messages, admin broadcasts) is routed
 * through here and logged to `sms_logs` regardless of outcome.
 */
class SmsService
{
    private const DEFAULT_PURCHASE_TEMPLATE = 'سلام {name}، خرید شما با شماره سفارش {order_number} با موفقیت ثبت شد. کد فعال‌سازی: {code}';

    private const OTP_TEMPLATE = 'کد ورود شما به آکادمی بهرام رستمی: {code}\nاین کد را در اختیار دیگران قرار ندهید.';

    private const WELCOME_TEMPLATE = 'سلام {name} عزیز؛ به آکادمی بهرام رستمی خوش آمدی! برای شروع به پنل کاربری خودت سر بزن.';

    public function sendPurchaseConfirmation(Order $order): bool
    {
        $settings = SmsSetting::current();

        if (! $settings->isReady()) {
            Log::channel('sms')->warning('SMS not sent: SMS service not configured or inactive.', [
                'order_id' => $order->id,
            ]);

            return false;
        }

        $message = $this->renderTemplate($settings->purchase_message_template, $order);

        return $this->dispatch($order->customer_phone, $message, $order->user_id);
    }

    public function sendOtp(string $mobile, string $code): bool
    {
        $message = str_replace('{code}', $code, self::OTP_TEMPLATE);

        return $this->dispatch($mobile, $message, null);
    }

    public function sendWelcome(User $user): bool
    {
        $name = $user->name ?: 'دانشجو';
        $message = str_replace('{name}', $name, self::WELCOME_TEMPLATE);

        return $this->dispatch($user->mobile, $message, $user->id);
    }

    /** Generic send used by admin broadcasts / notifications. */
    public function sendToMobile(string $mobile, string $message, ?int $userId = null): bool
    {
        return $this->dispatch($mobile, $message, $userId);
    }

    /**
     * @return array{success: bool, message: string}
     */
    public function sendTest(string $phone): array
    {
        $settings = SmsSetting::current();

        if (! $settings->isReady()) {
            return ['success' => false, 'message' => 'سرویس پیامک تنظیم یا فعال نشده است.'];
        }

        $sent = $this->dispatch($phone, 'این یک پیامک آزمایشی از پنل مدیریت بهرام است.', null);

        return [
            'success' => $sent,
            'message' => $sent ? 'پیامک آزمایشی با موفقیت ارسال شد.' : 'ارسال پیامک آزمایشی ناموفق بود. لاگ‌های سرویس پیامک را بررسی کنید.',
        ];
    }

    private function dispatch(string $mobile, string $message, ?int $userId): bool
    {
        $settings = SmsSetting::current();

        $log = SmsLog::create([
            'user_id' => $userId,
            'mobile' => $mobile,
            'message' => $message,
            'provider' => $settings->sms_provider,
            'status' => 'pending',
        ]);

        if (! $settings->isReady()) {
            $log->update(['status' => 'failed']);

            return false;
        }

        $result = $this->provider($settings)->send($mobile, $message);

        $log->update([
            'status' => $result['success'] ? 'sent' : 'failed',
            'sent_at' => $result['success'] ? now() : null,
            'raw_response' => is_array($result['raw'] ?? null) ? $result['raw'] : null,
        ]);

        if ($result['success']) {
            Log::channel('sms')->info('SMS sent successfully.', ['mobile' => $mobile, 'provider' => $settings->sms_provider]);
        } else {
            Log::channel('sms')->error('SMS send failed.', ['mobile' => $mobile, 'provider' => $settings->sms_provider, 'message' => $result['message']]);
        }

        return $result['success'];
    }

    private function provider(SmsSetting $settings): SmsProviderContract
    {
        return match ($settings->sms_provider) {
            'melipayamak' => new MelipayamakProvider($settings),
            default => new KavenegarProvider($settings),
        };
    }

    private function renderTemplate(?string $template, Order $order): string
    {
        $template = filled($template) ? $template : self::DEFAULT_PURCHASE_TEMPLATE;

        return strtr($template, [
            '{name}' => $order->customer_name,
            '{phone}' => $order->customer_phone,
            '{order_number}' => $order->order_number,
            '{product_title}' => $order->product?->title,
            '{code}' => $order->spotplayer_license_code ?: '-',
        ]);
    }
}
