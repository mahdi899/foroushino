<?php

namespace App\Modules\TelegramBot\Http\Controllers;

use App\Enums\OtpPurpose;
use App\Models\DiscountCode;
use App\Models\Seminar;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\AccountLinkService;
use App\Modules\TelegramBot\Services\TelegramUserSyncService;
use App\Services\Exceptions\OtpException;
use App\Services\OtpService;
use App\Services\TelegramHostAccountSnapshotService;
use App\Services\TelegramHostCatalogRevision;
use App\Services\TelegramHostPayloadBuilder;
use App\Services\TelegramHostRegistrationService;
use App\Services\TelegramInfrastructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sync/live API for the external "host" Telegram app (standalone PHP+MySQL
 * app deployed on a cPanel host, see `telegram/`). Everything here is
 * reached only through `proxy.origin:presence` + `telegram.host.token`
 * (Bearer host_sync_secret + JSON over HTTPS).
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
        private readonly OtpService $otp,
        private readonly TelegramUserSyncService $userSync,
        private readonly AccountLinkService $accountLinks,
        private readonly TelegramInfrastructureService $infrastructure,
        private readonly TelegramHostCatalogRevision $catalogRevision,
        private readonly TelegramHostAccountSnapshotService $accountSnapshots,
        private readonly TelegramHostRegistrationService $hostRegistration,
        private readonly TelegramHostPayloadBuilder $payloadBuilder,
    ) {}

    public function bootstrap(Request $request): JsonResponse
    {
        $bot = $this->productionBot();

        return $this->jsonResponse($this->payloadBuilder->bootstrapPayload($bot));
    }

    public function syncMeta(Request $request): JsonResponse
    {
        $this->productionBot();

        return $this->jsonResponse([
            'catalog_revision' => $this->catalogRevision->current(),
            'synced_at' => now()->toIso8601String(),
        ]);
    }

    public function webhookRegisterAck(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $nonce = trim((string) ($payload['nonce'] ?? ''));
        $cleared = $this->infrastructure->clearHostWebhookRegistration($nonce !== '' ? $nonce : null);

        return $this->jsonResponse(['ok' => $cleared]);
    }

    public function catalog(Request $request): JsonResponse
    {
        return $this->jsonResponse($this->payloadBuilder->catalogPayload());
    }

    public function otpRequest(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $mobile = trim((string) ($payload['mobile'] ?? ''));

        if ($mobile === '') {
            return $this->jsonResponse(['ok' => false, 'message' => 'شماره موبایل نامعتبر است.'], 422);
        }

        try {
            $this->otp->send($mobile, OtpPurpose::TelegramLink, $request->ip());
        } catch (OtpException $e) {
            return $this->jsonResponse(['ok' => false, 'message' => $e->getMessage()], 429);
        }

        return $this->jsonResponse(['ok' => true]);
    }

    public function otpVerify(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $mobile = trim((string) ($payload['mobile'] ?? ''));
        $code = trim((string) ($payload['code'] ?? ''));
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $displayName = trim((string) ($payload['display_name'] ?? ''));

        if ($mobile === '' || $code === '' || $telegramUserId <= 0) {
            return $this->jsonResponse(['ok' => false, 'message' => 'اطلاعات ناقص است.'], 422);
        }

        try {
            $this->otp->verify($mobile, $code, OtpPurpose::TelegramLink);
        } catch (OtpException $e) {
            return $this->jsonResponse(['ok' => false, 'message' => $e->getMessage()], 422);
        }

        $bot = $this->productionBot();

        $sync = DB::transaction(function () use ($bot, $telegramUserId, $mobile, $displayName) {
            $account = $this->accountLinks->findOrCreateAccount($bot, $telegramUserId, firstName: $displayName ?: null);
            $account->update(['mobile' => $mobile, 'display_name' => $displayName ?: $account->display_name, 'mobile_verified_at' => now()]);

            $result = $this->userSync->syncAfterMobileVerification($account->fresh());
            $account = $this->accountLinks->linkToUser($account->fresh(), $result['user']);

            return ['account' => $account, 'user' => $result['user'], 'lines' => $result['lines']];
        });

        return $this->jsonResponse([
            'ok' => true,
            'account' => $this->accountSnapshots->accountPayload($sync['account']->fresh(['user', 'bot'])),
            'summary_lines' => $sync['lines'],
        ]);
    }

    public function capacityCheck(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $seminarId = (int) ($payload['seminar_id'] ?? 0);

        $seminar = Seminar::query()->find($seminarId);
        if ($seminar === null) {
            return $this->jsonResponse(['ok' => false, 'message' => 'سمینار یافت نشد.'], 404);
        }

        return $this->jsonResponse([
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
            return $this->jsonResponse(['ok' => false, 'message' => 'کد تخفیف را وارد کنید.'], 422);
        }

        $discount = DiscountCode::query()->where('code', $code)->where('is_active', true)->first();

        if ($discount === null) {
            return $this->jsonResponse(['ok' => false, 'message' => 'کد تخفیف نامعتبر است.'], 404);
        }

        return $this->jsonResponse([
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
            return $this->jsonResponse(['ok' => true, 'found' => false]);
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

        return $this->jsonResponse([
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
            return $this->jsonResponse(['ok' => false, 'message' => 'شناسه تلگرام نامعتبر است.'], 422);
        }

        $from = is_array($payload['from'] ?? null) ? $payload['from'] : [];
        $startPayload = isset($payload['start_payload']) ? (string) $payload['start_payload'] : null;

        $result = $this->hostRegistration->start(
            $this->productionBot(),
            $telegramUserId,
            $from,
            $startPayload !== '' ? $startPayload : null,
        );

        return $this->jsonResponse($result);
    }

    public function registrationContact(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $phone = trim((string) ($payload['phone'] ?? ''));
        $contactUserId = (int) ($payload['contact_user_id'] ?? 0);

        if ($telegramUserId <= 0) {
            return $this->jsonResponse(['ok' => false, 'message' => 'شناسه تلگرام نامعتبر است.'], 422);
        }

        $result = $this->hostRegistration->shareContact(
            $this->productionBot(),
            $telegramUserId,
            $phone,
            $contactUserId,
        );

        return $this->jsonResponse($result);
    }

    public function registrationName(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $name = trim((string) ($payload['name'] ?? ''));

        if ($telegramUserId <= 0 || $name === '') {
            return $this->jsonResponse(['ok' => false, 'message' => 'اطلاعات ناقص است.'], 422);
        }

        $result = $this->hostRegistration->submitName($this->productionBot(), $telegramUserId, $name);

        return $this->jsonResponse($result);
    }

    public function registrationCallback(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $data = trim((string) ($payload['callback_data'] ?? ''));

        if ($telegramUserId <= 0 || $data === '') {
            return $this->jsonResponse(['ok' => false, 'message' => 'درخواست نامعتبر است.'], 422);
        }

        $result = $this->hostRegistration->regCallback($this->productionBot(), $telegramUserId, $data);

        return $this->jsonResponse($result);
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
    private function jsonResponse(array $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status);
    }
}
