<?php

namespace App\Services;

use App\Models\Order;
use App\Models\SpotplayerSetting;
use App\Services\Exceptions\SpotPlayerException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Adapter around the SpotPlayer license API (https://spotplayer.ir/help/api).
 */
class SpotPlayerService
{
    private const DEFAULT_BASE_URL = 'https://panel.spotplayer.ir';

    /**
     * Issue a license for the given order's product course and return the
     * raw SpotPlayer response (_id, key, url).
     *
     * @return array{_id: string, key: string, url: string}
     */
    public function issueLicense(Order $order): array
    {
        $settings = SpotplayerSetting::current();

        if (! $settings->isReady()) {
            throw new SpotPlayerException('سرویس SpotPlayer تنظیم یا فعال نشده است.');
        }

        $product = $order->product;

        if (! $product || blank($product->spotplayer_course_id)) {
            throw new SpotPlayerException('محصول این سفارش به هیچ دوره‌ای در SpotPlayer متصل نیست.');
        }

        $baseUrl = rtrim($settings->spotplayer_base_url ?: self::DEFAULT_BASE_URL, '/');

        try {
            $response = Http::withHeaders([
                '$API' => (string) $settings->spotplayer_api_key,
                '$LEVEL' => -1,
            ])
                ->timeout(30)
                ->post("{$baseUrl}/license/edit/", [
                    'course' => [$product->spotplayer_course_id],
                    'name' => $order->customer_name,
                    'watermark' => [
                        'texts' => [['text' => $order->customer_phone]],
                    ],
                    'payload' => $order->order_number,
                    'device' => ['p6' => 1],
                ]);
        } catch (Throwable $e) {
            Log::channel('spotplayer')->error('SpotPlayer request could not be sent.', [
                'message' => $e->getMessage(),
                'order_id' => $order->id,
            ]);

            throw new SpotPlayerException('ارتباط با سرویس SpotPlayer برقرار نشد.');
        }

        $body = $response->json();

        if ($response->failed() || blank(data_get($body, 'key'))) {
            Log::channel('spotplayer')->error('SpotPlayer license creation failed.', [
                'order_id' => $order->id,
                'status' => $response->status(),
                'response' => $body,
            ]);

            throw new SpotPlayerException('صدور لایسنس SpotPlayer ناموفق بود.');
        }

        Log::channel('spotplayer')->info('SpotPlayer license issued.', [
            'order_id' => $order->id,
            'license_id' => data_get($body, '_id'),
        ]);

        return $body;
    }

    /**
     * @return array{success: bool, message: string}
     */
    public function testConnection(): array
    {
        $settings = SpotplayerSetting::current();

        if (blank($settings->spotplayer_api_key)) {
            return ['success' => false, 'message' => 'کلید API برای SpotPlayer وارد نشده است.'];
        }

        $baseUrl = rtrim($settings->spotplayer_base_url ?: self::DEFAULT_BASE_URL, '/');

        try {
            $response = Http::withHeaders([
                '$API' => (string) $settings->spotplayer_api_key,
                '$LEVEL' => -1,
            ])
                ->timeout(20)
                ->post("{$baseUrl}/license/edit/", [
                    'test' => true,
                    'course' => [],
                    'name' => 'اتصال آزمایشی',
                    'watermark' => ['texts' => [['text' => 'test']]],
                ]);
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'ارتباط با سرویس SpotPlayer برقرار نشد: '.$e->getMessage()];
        }

        if (in_array($response->status(), [401, 403], true)) {
            return ['success' => false, 'message' => 'کلید API نامعتبر است.'];
        }

        return ['success' => true, 'message' => 'اتصال به SpotPlayer برقرار شد (کلید API معتبر تشخیص داده شد).'];
    }
}
