<?php

namespace App\Modules\TelegramBot\Http\Controllers;

use App\Enums\OtpPurpose;
use App\Models\DiscountCode;
use App\Models\Product;
use App\Models\Seminar;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use App\Modules\TelegramBot\Models\TelegramSupportCategory;
use App\Modules\TelegramBot\Services\AccountLinkService;
use App\Modules\TelegramBot\Services\BotMessageCatalog;
use App\Modules\TelegramBot\Services\TelegramCatalogMediaService;
use App\Modules\TelegramBot\Services\TelegramCheckoutService;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramSeminarCatalogService;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Modules\TelegramBot\Services\TelegramUserSyncService;
use App\Services\Exceptions\OtpException;
use App\Services\OtpService;
use App\Services\TelegramHostAccountSnapshotService;
use App\Services\TelegramHostCatalogRevision;
use App\Services\TelegramHostRegistrationService;
use App\Services\TelegramInfrastructureService;
use App\Support\AesGcmCipher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sync/live API for the external "host" Telegram app (standalone PHP+MySQL
 * app deployed on a cPanel host, see `telegram/`). Everything here is
 * reached only through `proxy.origin:presence` + `telegram.host.signature`
 * (HMAC + AES-GCM) — see routes/telegram-host.php.
 *
 * Two kinds of endpoints:
 *  - "Bootstrap/catalog" (bootstrap, catalog): safe to cache long-term on the
 *    host — messages, keyboards, feature flags, required chats, course list.
 *  - "Live" (otp/*, capacity-check, discount/validate, account/fetch): must
 *    never be cached — they touch OTP, seat capacity, and account identity.
 */
class TelegramHostSyncController
{
    public function __construct(
        private readonly BotMessageCatalog $messages,
        private readonly TelegramProductCatalogService $products,
        private readonly TelegramSeminarCatalogService $seminars,
        private readonly OtpService $otp,
        private readonly TelegramUserSyncService $userSync,
        private readonly AccountLinkService $accountLinks,
        private readonly TelegramCheckoutService $checkout,
        private readonly TelegramCatalogMediaService $catalogMedia,
        private readonly TelegramInfrastructureService $infrastructure,
        private readonly TelegramHostCatalogRevision $catalogRevision,
        private readonly TelegramHostAccountSnapshotService $accountSnapshots,
        private readonly TelegramHostRegistrationService $hostRegistration,
    ) {}

    public function bootstrap(Request $request): JsonResponse
    {
        $bot = $this->productionBot();

        $messages = collect(BotMessageCatalog::defaults())
            ->mapWithKeys(fn (array $default, string $key) => [$key => $this->messages->get($bot, $key)])
            ->all();

        $requiredChats = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'chat_id', 'title', 'invite_link', 'is_required'])
            ->toArray();

        $features = [];
        foreach (BotFeatureFlag::cases() as $flag) {
            $features[$flag->value] = $bot->featureEnabled($flag);
        }

        $supportCategories = TelegramSupportCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['key', 'title_fa', 'default_topic_id', 'sort_order'])
            ->map(fn (TelegramSupportCategory $c) => [
                'key' => $c->key,
                'title_fa' => $c->title_fa,
                'default_topic_id' => $c->default_topic_id,
                'sort_order' => $c->sort_order,
            ])
            ->values()
            ->all();

        return $this->encryptedResponse($request, array_merge([
            'bot' => [
                'id' => $bot->id,
                'key' => $bot->key,
                'features' => $features,
                'is_active' => (bool) $bot->is_active,
                'reports_group_chat_id' => $bot->reportsGroupChatId(),
            ],
            'messages' => $messages,
            'required_chats' => $requiredChats,
            'support_categories' => $supportCategories,
            'checkout' => [
                'zarinpal_enabled' => $this->checkout->zarinpalEnabled($bot),
                'c2c_enabled' => $this->checkout->cardToCardEnabled($bot),
            ],
            'site_urls' => [
                'identity' => TelegramSiteUrl::identityPage(),
                'family' => TelegramSiteUrl::familyHome(),
                'sat' => TelegramSiteUrl::satPage(),
                'referral_panel' => TelegramSiteUrl::page('panel/referrals'),
            ],
            'synced_at' => now()->toIso8601String(),
            'catalog_revision' => $this->catalogRevision->current(),
        ], $this->infrastructure->pendingHostWebhookBootstrapExtra()));
    }

    public function syncMeta(Request $request): JsonResponse
    {
        $this->productionBot();

        return $this->encryptedResponse($request, [
            'catalog_revision' => $this->catalogRevision->current(),
            'synced_at' => now()->toIso8601String(),
        ]);
    }

    public function webhookRegisterAck(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $nonce = trim((string) ($payload['nonce'] ?? ''));
        $cleared = $this->infrastructure->clearHostWebhookRegistration($nonce !== '' ? $nonce : null);

        return $this->encryptedResponse($request, ['ok' => $cleared]);
    }

    public function catalog(Request $request): JsonResponse
    {
        $courses = $this->products->listPublicCourses()->map(function (Product $p) {
            $photo = $this->catalogMedia->productPhoto($p);

            return [
                'id' => $p->id,
                'slug' => $p->slug,
                'title' => $p->title,
                'price' => $p->price,
                'sale_price' => $p->sale_price,
                'photo' => $photo,
            ];
        })->values();

        $seminars = $this->seminars->listUpcoming()->map(function (Seminar $s) {
            $s->loadMissing('product');
            $photo = $this->catalogMedia->seminarPhoto($s);
            $product = $s->product;
            $base = (int) ($s->price ?: $product?->price ?: 0);
            $saleRaw = $s->sale_price ?? $product?->sale_price;
            $sale = $saleRaw !== null ? (int) $saleRaw : null;

            return [
                'id' => $s->id,
                'product_id' => $s->product_id,
                'title' => $s->title,
                'date' => $s->date?->toIso8601String(),
                'location' => $s->location,
                'capacity_hint' => $s->capacity,
                'price' => $base,
                'sale_price' => $sale,
                'photo' => $photo,
            ];
        })->values();

        return $this->encryptedResponse($request, [
            'courses' => $courses,
            'seminars' => $seminars,
            'synced_at' => now()->toIso8601String(),
        ]);
    }

    public function otpRequest(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $mobile = trim((string) ($payload['mobile'] ?? ''));

        if ($mobile === '') {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'شماره موبایل نامعتبر است.'], 422);
        }

        try {
            $this->otp->send($mobile, OtpPurpose::TelegramLink, $request->ip());
        } catch (OtpException $e) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => $e->getMessage()], 429);
        }

        return $this->encryptedResponse($request, ['ok' => true]);
    }

    public function otpVerify(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $mobile = trim((string) ($payload['mobile'] ?? ''));
        $code = trim((string) ($payload['code'] ?? ''));
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $displayName = trim((string) ($payload['display_name'] ?? ''));

        if ($mobile === '' || $code === '' || $telegramUserId <= 0) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'اطلاعات ناقص است.'], 422);
        }

        try {
            $this->otp->verify($mobile, $code, OtpPurpose::TelegramLink);
        } catch (OtpException $e) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => $e->getMessage()], 422);
        }

        $bot = $this->productionBot();

        $sync = DB::transaction(function () use ($bot, $telegramUserId, $mobile, $displayName) {
            $account = $this->accountLinks->findOrCreateAccount($bot, $telegramUserId, firstName: $displayName ?: null);
            $account->update(['mobile' => $mobile, 'display_name' => $displayName ?: $account->display_name, 'mobile_verified_at' => now()]);

            $result = $this->userSync->syncAfterMobileVerification($account->fresh());
            $account = $this->accountLinks->linkToUser($account->fresh(), $result['user']);

            return ['account' => $account, 'user' => $result['user'], 'lines' => $result['lines']];
        });

        return $this->encryptedResponse($request, [
            'ok' => true,
            'account' => [
                'telegram_user_id' => $telegramUserId,
                'user_id' => $sync['user']->id,
                'mobile' => $sync['account']->mobile,
                'display_name' => $sync['account']->display_name,
                'is_bot_admin' => (bool) $sync['account']->is_bot_admin,
            ],
            'summary_lines' => $sync['lines'],
        ]);
    }

    public function capacityCheck(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $seminarId = (int) ($payload['seminar_id'] ?? 0);

        $seminar = Seminar::query()->find($seminarId);
        if ($seminar === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'سمینار یافت نشد.'], 404);
        }

        return $this->encryptedResponse($request, [
            'ok' => true,
            'is_full' => $seminar->isFull(),
            'remaining_seats' => $seminar->remainingSeats(),
        ]);
    }

    public function discountValidate(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $code = trim((string) ($payload['code'] ?? ''));

        if ($code === '') {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'کد تخفیف را وارد کنید.'], 422);
        }

        $discount = DiscountCode::query()->where('code', $code)->where('is_active', true)->first();

        if ($discount === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'کد تخفیف نامعتبر است.'], 404);
        }

        return $this->encryptedResponse($request, [
            'ok' => true,
            'discount_type' => $discount->discount_type?->value,
            'discount_value' => $discount->discount_value,
            'max_discount_amount' => $discount->max_discount_amount,
        ]);
    }

    public function accountFetch(Request $request): JsonResponse
    {
        $hostPayload = $this->hostPayload($request);
        $telegramUserId = (int) ($hostPayload['telegram_user_id'] ?? 0);

        $bot = $this->productionBot();
        $account = $bot->accounts()->where('telegram_user_id', $telegramUserId)->first();

        if ($account === null) {
            return $this->encryptedResponse($request, ['ok' => true, 'found' => false]);
        }

        $accountPayload = [
            'telegram_user_id' => $telegramUserId,
            'user_id' => $account->user_id,
            'mobile' => $account->mobile,
            'mobile_verified_at' => $account->mobile_verified_at?->toIso8601String(),
            'display_name' => $account->display_name,
            'is_bot_admin' => (bool) $account->is_bot_admin,
        ];

        $includeSnapshot = filter_var($hostPayload['include_snapshot'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($includeSnapshot && $account->mobile_verified_at !== null) {
            $accountPayload['snapshot'] = $this->accountSnapshots->buildSnapshot($account);
        }

        return $this->encryptedResponse($request, [
            'ok' => true,
            'found' => true,
            'account' => $accountPayload,
        ]);
    }

    public function registrationStart(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        if ($telegramUserId <= 0) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'شناسه تلگرام نامعتبر است.'], 422);
        }

        $from = is_array($payload['from'] ?? null) ? $payload['from'] : [];
        $startPayload = isset($payload['start_payload']) ? (string) $payload['start_payload'] : null;

        $result = $this->hostRegistration->start(
            $this->productionBot(),
            $telegramUserId,
            $from,
            $startPayload !== '' ? $startPayload : null,
        );

        return $this->encryptedResponse($request, $result);
    }

    public function registrationContact(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $phone = trim((string) ($payload['phone'] ?? ''));
        $contactUserId = (int) ($payload['contact_user_id'] ?? 0);

        if ($telegramUserId <= 0) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'شناسه تلگرام نامعتبر است.'], 422);
        }

        $result = $this->hostRegistration->shareContact(
            $this->productionBot(),
            $telegramUserId,
            $phone,
            $contactUserId,
        );

        return $this->encryptedResponse($request, $result);
    }

    public function registrationName(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $name = trim((string) ($payload['name'] ?? ''));

        if ($telegramUserId <= 0 || $name === '') {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'اطلاعات ناقص است.'], 422);
        }

        $result = $this->hostRegistration->submitName($this->productionBot(), $telegramUserId, $name);

        return $this->encryptedResponse($request, $result);
    }

    public function registrationCallback(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $data = trim((string) ($payload['callback_data'] ?? ''));

        if ($telegramUserId <= 0 || $data === '') {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'درخواست نامعتبر است.'], 422);
        }

        $result = $this->hostRegistration->regCallback($this->productionBot(), $telegramUserId, $data);

        return $this->encryptedResponse($request, $result);
    }

    /** @return array<string, mixed> */
    private function hostPayload(Request $request): array
    {
        $payload = $request->attributes->get('host_payload');

        return is_array($payload) ? $payload : [];
    }

    private function productionBot(): TelegramBot
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();

        if ($bot === null) {
            Log::channel('telegram')->error('Telegram host sync: production bot not found.');

            abort(500, 'Bot not configured.');
        }

        return $bot;
    }

    /** @param  array<string, mixed>  $data */
    private function encryptedResponse(Request $request, array $data, int $status = 200): JsonResponse
    {
        $aesKey = (string) $request->attributes->get('host_aes_key', '');
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($aesKey === '' || $json === false) {
            return response()->json($data, $status);
        }

        return response()->json(['payload' => AesGcmCipher::encrypt($json, $aesKey)], $status);
    }
}
