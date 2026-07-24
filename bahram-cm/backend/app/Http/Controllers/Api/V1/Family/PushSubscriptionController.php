<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Services\Family\FamilyAccessService;
use App\Services\WebPushSender;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly WebPushSender $webPush,
    ) {}

    public function vapidPublicKey(): JsonResponse
    {
        $key = $this->webPush->publicKey();
        if ($key === null) {
            return ApiResponse::error('webpush_unconfigured', 'اعلان پوش هنوز پیکربندی نشده است.', 503);
        }

        return ApiResponse::success(['public_key' => $key]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->access->requireMembership($request->user());

        if (! $this->webPush->isConfigured()) {
            return ApiResponse::error('webpush_unconfigured', 'اعلان پوش هنوز پیکربندی نشده است.', 503);
        }

        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:512', 'url'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'contentEncoding' => ['nullable', 'string', 'max:32', 'in:aesgcm,aes128gcm'],
        ]);

        $subscription = PushSubscription::query()->updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'user_id' => (int) $request->user()->id,
                'channel' => 'family',
                'public_key' => $data['keys']['p256dh'],
                'auth_token' => $data['keys']['auth'],
                'content_encoding' => $data['contentEncoding'] ?? 'aes128gcm',
                'user_agent' => substr((string) $request->userAgent(), 0, 512) ?: null,
            ],
        );

        return ApiResponse::success([
            'id' => $subscription->id,
            'subscribed' => true,
        ], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:512'],
        ]);

        PushSubscription::query()
            ->where('user_id', (int) $request->user()->id)
            ->where('endpoint', $data['endpoint'])
            ->delete();

        return ApiResponse::success(['subscribed' => false]);
    }

    public function status(Request $request): JsonResponse
    {
        $this->access->requireMembership($request->user());

        $count = PushSubscription::query()
            ->where('user_id', (int) $request->user()->id)
            ->where('channel', 'family')
            ->count();

        return ApiResponse::success([
            'subscribed' => $count > 0,
            'configured' => $this->webPush->isConfigured(),
            'count' => $count,
        ]);
    }
}
