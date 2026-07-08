<?php

namespace App\Jobs;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use App\Enums\SpotplayerLicenseStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Services\AdminTelegramLogService;
use App\Services\Exceptions\SpotPlayerException;
use App\Services\InAppNotificationService;
use App\Services\ReferralService;
use App\Services\SmsService;
use App\Services\SpotPlayerService;
use App\Support\Mobile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Runs after a successful, server-verified Zarinpal payment. Course access,
 * the SpotPlayer license record, and the referral conversion/cashback are
 * only ever created here — never before payment is verified — and the DB
 * writes are committed atomically so a partial fulfillment never persists.
 */
class FulfillOrderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $orderId) {}

    public function handle(
        SpotPlayerService $spotPlayer,
        SmsService $sms,
        ReferralService $referrals,
        InAppNotificationService $notifications,
        AdminTelegramLogService $adminTelegram,
    ): void {
        $order = Order::query()->with('product')->find($this->orderId);

        if (! $order || ! $order->isPaid()) {
            Log::channel('payment')->warning('FulfillOrderJob skipped: order not found or not paid.', [
                'order_id' => $this->orderId,
            ]);

            return;
        }

        $userId = $order->user_id ?? $this->resolveFallbackUserId($order);

        // SpotPlayer is an external HTTP call — issue it before opening the
        // DB transaction so we never hold a transaction open across I/O.
        $licenseResponse = null;
        $needsSpotPlayerLicense = $userId
            && $order->product
            && filled($order->product->spotplayer_course_id)
            && blank($order->spotplayer_license_code);

        if ($needsSpotPlayerLicense) {
            $licenseResponse = $this->reuseExistingLicense($userId, $order->product_id);

            if (! $licenseResponse) {
                try {
                    $licenseResponse = $spotPlayer->issueLicense($order);
                } catch (SpotPlayerException $e) {
                    Log::channel('spotplayer')->error('Could not issue SpotPlayer license during fulfillment.', [
                        'order_id' => $order->id,
                        'message' => $e->getMessage(),
                    ]);

                    // SpotPlayer rejects duplicate watermark phones on the same course.
                    $licenseResponse = $this->reuseExistingLicense($userId, $order->product_id);
                }
            }
        }

        DB::transaction(function () use ($order, $userId, $licenseResponse, $referrals) {
            if ($userId) {
                $courseAccess = null;

                if ($order->product_id) {
                    $courseAccess = CourseAccess::query()->firstOrCreate(
                        ['user_id' => $userId, 'product_id' => $order->product_id],
                        [
                            'order_id' => $order->id,
                            'status' => CourseAccessStatus::Active,
                            'access_type' => 'lifetime',
                            'source' => CourseAccessSource::Zarinpal,
                            'activated_at' => now(),
                        ]
                    );

                    if ($courseAccess->status !== CourseAccessStatus::Active) {
                        $courseAccess->update(['status' => CourseAccessStatus::Active, 'activated_at' => now(), 'deactivated_at' => null]);
                    }
                }

                if ($licenseResponse) {
                    $order->update(['spotplayer_license_code' => $licenseResponse['key'] ?? null]);

                    SpotplayerLicense::query()->updateOrCreate(
                        ['order_id' => $order->id],
                        [
                            'user_id' => $userId,
                            'product_id' => $order->product_id,
                            'course_access_id' => $courseAccess?->id,
                            'spotplayer_course_id' => $order->product?->spotplayer_course_id,
                            'license_key' => $licenseResponse['key'] ?? null,
                            'license_url' => $this->normalizeSpotPlayerLicenseUrl($licenseResponse['url'] ?? null),
                            'status' => SpotplayerLicenseStatus::Active,
                            'raw_response' => $licenseResponse,
                        ]
                    );
                }
            }

            // Referral conversion + cashback are only ever created for a paid order.
            $referrals->createConversionIfEligible($order, $order->referral_code);
        });

        if ($sms->sendPurchaseConfirmation($order->fresh('product'))) {
            $order->update(['sms_sent_at' => now()]);
        }

        $order->refresh();
        if (filled($order->spotplayer_license_code)) {
            $sms->sendLicenseCreated($order);
            $adminTelegram->notifyLicenseIssued($order);
        }

        $spotPlayerProduct = filled($order->product?->spotplayer_course_id);
        $licenseReady = filled($order->spotplayer_license_code) || ! $spotPlayerProduct;

        $order->update(['status' => $licenseReady ? 'fulfilled' : 'paid']);

        // Older paid orders for the same user may have missed fulfillment.
        if ($userId && $order->product_id && $licenseReady) {
            $this->markSiblingPaidOrdersFulfilled($userId, (int) $order->product_id);
        }

        $order->loadMissing('product', 'user');
        $notifications->orderPaid($order);
        if ($licenseReady && filled($order->spotplayer_license_code)) {
            $notifications->licenseReady($order);
        }

        $adminTelegram->notifyOrderFulfilled($order);
    }

    /**
     * @return array{_id?: string, key: string, url?: string}|null
     */
    private function reuseExistingLicense(int $userId, int $productId): ?array
    {
        $existing = SpotplayerLicense::query()
            ->where('user_id', $userId)
            ->where('product_id', $productId)
            ->where('status', SpotplayerLicenseStatus::Active)
            ->whereNotNull('license_key')
            ->orderByDesc('id')
            ->first();

        if (! $existing?->license_key) {
            return null;
        }

        Log::channel('spotplayer')->info('Reusing existing SpotPlayer license for repeat purchase.', [
            'user_id' => $userId,
            'product_id' => $productId,
            'source_order_id' => $existing->order_id,
            'license_id' => data_get($existing->raw_response, '_id'),
        ]);

        return [
            '_id' => data_get($existing->raw_response, '_id'),
            'key' => $existing->license_key,
            'url' => $this->licenseUrlToApiPath($existing->license_url),
        ];
    }

    private function licenseUrlToApiPath(?string $licenseUrl): ?string
    {
        if (blank($licenseUrl)) {
            return null;
        }

        $path = parse_url($licenseUrl, PHP_URL_PATH);

        return is_string($path) && $path !== '' ? $path : null;
    }

    /** Last-resort user resolution for orders created before Phase-1 linkage existed. */
    private function resolveFallbackUserId(Order $order): ?int
    {
        $mobile = Mobile::normalize($order->customer_phone);

        if (! $mobile) {
            return null;
        }

        $user = User::query()->where('mobile', $mobile)->where('is_admin', false)->first();

        if (! $user) {
            $user = User::create(['name' => $order->customer_name ?: 'دانشجو', 'mobile' => $mobile, 'status' => 'active']);
        }

        $order->update(['user_id' => $user->id]);

        return $user->id;
    }

    private function normalizeSpotPlayerLicenseUrl(?string $url): ?string
    {
        if (blank($url)) {
            return null;
        }

        if (str_starts_with($url, '/')) {
            return 'https://dl.spotplayer.ir'.$url;
        }

        return $url;
    }

    private function markSiblingPaidOrdersFulfilled(int $userId, int $productId): void
    {
        Order::query()
            ->where('user_id', $userId)
            ->where('product_id', $productId)
            ->where('status', 'paid')
            ->update(['status' => 'fulfilled']);
    }
}
