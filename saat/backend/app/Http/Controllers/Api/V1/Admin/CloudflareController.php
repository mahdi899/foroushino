<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\Cloudflare\CloudflareCacheService;
use App\Services\Cloudflare\CloudflareIntegrationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CloudflareController extends Controller
{
    public function __construct(
        private readonly CloudflareIntegrationService $integrations,
        private readonly CloudflareCacheService $cache,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorizeCloudflare($request);

        return ApiResponse::success($this->integrations->publicView());
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeCloudflare($request);

        $validated = $request->validate([
            'cloudflare_zone_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'cloudflare_api_token_input' => ['sometimes', 'nullable', 'string', 'max:512'],
        ]);

        $this->integrations->saveCredentials($validated);

        return ApiResponse::success($this->integrations->publicView(), 'تنظیمات Cloudflare ذخیره شد');
    }

    public function test(Request $request): JsonResponse
    {
        $this->authorizeCloudflare($request);

        return ApiResponse::success($this->integrations->testConnection());
    }

    public function purge(Request $request): JsonResponse
    {
        $this->authorizeCloudflare($request);

        $ok = $this->cache->purgeEverything();

        return ApiResponse::success([
            'ok' => $ok,
            'message' => $ok ? 'کش Cloudflare پاک شد.' : 'پاک‌سازی ناموفق — Token یا Zone ID را بررسی کنید.',
        ]);
    }

    public function applyEdge(Request $request): JsonResponse
    {
        $this->authorizeCloudflare($request);

        return ApiResponse::success($this->cache->applyEdgeCacheRules());
    }

    public function developmentMode(Request $request): JsonResponse
    {
        $this->authorizeCloudflare($request);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $ok = $this->integrations->setDevelopmentMode((bool) $validated['enabled']);

        return ApiResponse::success([
            'ok' => $ok,
            'cloudflare_dev_mode' => $this->integrations->fetchDevelopmentMode(),
            'message' => $ok
                ? ((bool) $validated['enabled'] ? 'Development Mode روشن شد (۳ ساعت).' : 'Development Mode خاموش شد.')
                : 'تغییر Development Mode ناموفق بود.',
        ]);
    }

    private function authorizeCloudflare(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('admin.settings'), 403, 'اجازه دسترسی ندارید.');
    }
}
