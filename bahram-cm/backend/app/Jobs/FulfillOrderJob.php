<?php

namespace App\Jobs;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use App\Enums\SpotplayerLicenseStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Services\TelegramHostAccountSnapshotService;
use App\Services\TelegramHostAccountSync;
use App\Services\AdminTelegramLogService;
use App\Services\DiscountService;
use App\Services\Exceptions\SpotPlayerException;
use App\Services\InAppNotificationService;
use App\Services\ReferralService;
use App\Services\SmsService;
use App\Services\SpotPlayerService;
use App\Services\TelegramInfrastructureService;
use App\Support\AccessSyncCache;
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
        DiscountService $discounts,
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

        DB::transaction(function () use ($order, $userId, $licenseResponse, $referrals, $discounts) {
            if ($userId) {
                $courseAccess = null;
                $order->loadMissing(['product.seminar', 'product.referenceChannel']);
                $isSeminarProduct = $order->product?->isSeminarProduct() ?? false;
                $isReferenceChannelProduct = $order->product?->isReferenceChannelProduct() ?? false;

                if ($order->product_id && ! $isSeminarProduct && ! $isReferenceChannelProduct) {
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

                if ($isSeminarProduct) {
                    $this->registerSeminarAttendee($order, $userId);
                }

                if ($isReferenceChannelProduct) {
                    $this->registerReferenceChannelEntitlement($order, $userId);
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
            $discounts->recordUsage($order);
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

        if ($userId) {
            AccessSyncCache::forgetUserId($userId);
        }

        $order->loadMissing('product', 'user');
        $notifications->orderPaid($order);
        if ($licenseReady && filled($order->spotplayer_license_code)) {
            $notifications->licenseReady($order);
        }

        $adminTelegram->notifyOrderFulfilled($order);

        $templateVars = [
            'order_number' => (string) ($order->order_number ?? $order->id),
            'product_title' => (string) ($order->product?->title ?? '—'),
        ];

        $identityUrl = \App\Modules\TelegramBot\Support\TelegramSiteUrl::identityPage();
        $botStartUrl = \App\Modules\TelegramBot\Support\TelegramSiteUrl::botStartDeepLink('reference');
        $isReferencePurchase = $order->product?->isReferenceChannelProduct() ?? false;

        $notification = [
            'template_key' => 'order_paid_generic',
            'template_vars' => $templateVars,
            'options' => [],
        ];
        if ($isReferencePurchase) {
            $notification['template_append_key'] = 'order_paid_reference_extra';
        }

        $notifyOptions = [];
        $keyboard = [];
        if ($identityUrl && $isReferencePurchase) {
            foreach (\App\Modules\TelegramBot\Support\TelegramSiteUrl::urlKeyboardRow('احراز هویت سطح ۲', $identityUrl, 'primary', 'lock') as $row) {
                $keyboard[] = $row;
            }
        }
        if ($botStartUrl && $isReferencePurchase) {
            foreach (\App\Modules\TelegramBot\Support\TelegramSiteUrl::urlKeyboardRow('به عضویت در کانال مرجع', $botStartUrl, 'primary', 'channel') as $row) {
                $keyboard[] = $row;
            }
        }
        if ($keyboard !== []) {
            $notifyOptions['reply_markup'] = ['inline_keyboard' => $keyboard];
        }
        $notification['options'] = $notifyOptions;

        $renderer = app(\App\Modules\TelegramBot\Support\BotMessageRenderer::class);
        $orderPaidText = $renderer->renderDefault('order_paid_generic', $templateVars);
        if ($isReferencePurchase) {
            $orderPaidText .= $renderer->renderDefault('order_paid_reference_extra', $templateVars);
        }

        $usesHost = app(TelegramInfrastructureService::class)->usesHostBridge();

        if ($userId) {
            $telegramAccounts = TelegramAccount::query()
                ->where('user_id', $userId)
                ->whereHas('bot', fn ($q) => $q->where('key', 'production'))
                ->with('bot')
                ->get();

            $hostSync = app(TelegramHostAccountSync::class);
            $delivered = false;

            if ($usesHost) {
                foreach ($telegramAccounts as $account) {
                    if ($hostSync->pushPaidOrderNotification($account, $notification)) {
                        $delivered = true;
                    }
                }

                // Buyer has never started the production bot — pre-provision
                // their access on the host by mobile number so it's ready the
                // instant they do /start, instead of waiting on a reconcile.
                if ($telegramAccounts->isEmpty() && $order->user !== null) {
                    if ($hostSync->pushMobileAccessImmediate($order->user)) {
                        $delivered = true;
                    }
                }

                // Host push timed out — still land ownership on foreign cache.
                if (! $delivered && $order->user !== null) {
                    $hostSync->pushUserAccountsImmediate($order->user);
                }
            }

            // If Iran→host push failed (timeout/WAF/circuit), still tell the
            // buyer via Bot API from Iran (proxy) so payment success is never silent.
            if (! $delivered) {
                foreach ($telegramAccounts as $account) {
                    if ($account->bot === null) {
                        continue;
                    }
                    try {
                        app(\App\Modules\TelegramBot\Clients\TelegramBotClientFactory::class)
                            ->forBot($account->bot)
                            ->sendMessage(
                                (int) $account->telegram_user_id,
                                $orderPaidText,
                                $notifyOptions,
                            );
                        $delivered = true;
                    } catch (\Throwable $e) {
                        Log::channel('telegram')->warning('Direct order_paid Telegram send failed.', [
                            'order_id' => $order->id,
                            'telegram_user_id' => $account->telegram_user_id,
                            'message' => $e->getMessage(),
                        ]);
                    }
                }
            }

            if (! $delivered) {
                try {
                    app(\App\Modules\TelegramBot\Services\NotificationOutboxWriter::class)->write(
                        eventType: 'order_paid',
                        userId: $userId,
                        payload: $notification + ['text' => $orderPaidText],
                        channels: ['telegram'],
                        idempotencyKey: 'order_paid:'.$order->id,
                    );
                } catch (\Throwable $e) {
                    Log::channel('telegram')->warning('Failed to enqueue telegram order_paid outbox.', [
                        'order_id' => $order->id,
                        'message' => $e->getMessage(),
                    ]);
                }
            }

            // Keep host ownership mirror fresh even when notify went via Bot API.
            foreach ($telegramAccounts as $account) {
                PushTelegramHostSyncJob::accountNow(
                    app(TelegramHostAccountSnapshotService::class)->accountPayload($account->fresh(['user', 'bot'])),
                );
            }
        }
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

    private function registerSeminarAttendee(Order $order, int $userId): void
    {
        $seminar = Seminar::query()
            ->where('product_id', $order->product_id)
            ->lockForUpdate()
            ->first();

        if (! $seminar) {
            return;
        }

        if ($seminar->isFull()) {
            Log::channel('payment')->warning('Seminar capacity full during fulfillment.', [
                'order_id' => $order->id,
                'seminar_id' => $seminar->id,
            ]);

            return;
        }

        SeminarAttendee::query()->firstOrCreate(
            ['seminar_id' => $seminar->id, 'user_id' => $userId],
            ['attendance_status' => 'registered']
        );
    }

    private function registerReferenceChannelEntitlement(Order $order, int $userId): void
    {
        $channel = ReferenceChannel::query()
            ->where('product_id', $order->product_id)
            ->lockForUpdate()
            ->first();

        if (! $channel) {
            return;
        }

        ReferenceChannelEntitlement::query()->firstOrCreate(
            [
                'reference_channel_id' => $channel->id,
                'user_id' => $userId,
            ],
            [
                'order_id' => $order->id,
                'source' => 'purchase',
            ]
        );
    }
}
