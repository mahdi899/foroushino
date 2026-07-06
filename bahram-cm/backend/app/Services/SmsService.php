<?php

namespace App\Services;

use App\Models\Order;
use App\Models\SmsSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Adapter around the Kavenegar SMS API. The provider is intentionally kept
 * behind this single class so it can be swapped later without touching
 * calling code.
 */
class SmsService
{
    private const DEFAULT_TEMPLATE = 'سلام {name}، خرید شما با شماره سفارش {order_number} با موفقیت ثبت شد. کد فعال‌سازی: {code}';

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

        return $this->send($order->customer_phone, $message, $settings);
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

        $sent = $this->send($phone, 'این یک پیامک آزمایشی از پنل مدیریت بهرام است.', $settings);

        return [
            'success' => $sent,
            'message' => $sent ? 'پیامک آزمایشی با موفقیت ارسال شد.' : 'ارسال پیامک آزمایشی ناموفق بود. لاگ‌های سرویس پیامک را بررسی کنید.',
        ];
    }

    private function send(string $phone, string $message, SmsSetting $settings): bool
    {
        try {
            $response = Http::timeout(20)->get("https://api.kavenegar.com/v1/{$settings->sms_api_key}/sms/send.json", array_filter([
                'receptor' => $phone,
                'sender' => $settings->sms_sender_number,
                'message' => $message,
            ]));
        } catch (Throwable $e) {
            Log::channel('sms')->error('SMS request could not be sent.', [
                'message' => $e->getMessage(),
                'phone' => $phone,
            ]);

            return false;
        }

        $status = data_get($response->json(), 'return.status');

        if ((int) $status !== 200) {
            Log::channel('sms')->error('SMS provider rejected the message.', [
                'phone' => $phone,
                'response' => $response->json(),
            ]);

            return false;
        }

        Log::channel('sms')->info('SMS sent successfully.', ['phone' => $phone]);

        return true;
    }

    private function renderTemplate(?string $template, Order $order): string
    {
        $template = filled($template) ? $template : self::DEFAULT_TEMPLATE;

        return strtr($template, [
            '{name}' => $order->customer_name,
            '{phone}' => $order->customer_phone,
            '{order_number}' => $order->order_number,
            '{product_title}' => $order->product?->title,
            '{code}' => $order->spotplayer_license_code ?: '-',
        ]);
    }
}
