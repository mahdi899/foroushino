<?php

namespace App\Jobs;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use App\Enums\SpotplayerLicenseStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Services\Exceptions\SpotPlayerException;
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

    public function handle(SpotPlayerService $spotPlayer, SmsService $sms, ReferralService $referrals): void
    {
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
        if ($userId && $order->product && filled($order->product->spotplayer_course_id) && blank($order->spotplayer_license_code)) {
            try {
                $licenseResponse = $spotPlayer->issueLicense($order);
            } catch (SpotPlayerException $e) {
                Log::channel('spotplayer')->error('Could not issue SpotPlayer license during fulfillment.', [
                    'order_id' => $order->id,
                    'message' => $e->getMessage(),
                ]);
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
                            'license_url' => $licenseResponse['url'] ?? null,
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
        }

        $order->update(['status' => 'fulfilled']);
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
}
