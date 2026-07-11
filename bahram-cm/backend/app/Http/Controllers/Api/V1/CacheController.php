<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CacheController extends Controller
{
    public function __construct(private readonly CacheService $cache) {}

    /** Public config for Next.js edge middleware (no auth). */
    public function publicConfig(): JsonResponse
    {
        return response()->json(['data' => $this->cache->publicConfig()]);
    }

    public function status(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        return response()->json(['data' => $this->cache->status()]);
    }

    public function settings(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        return response()->json(['data' => $this->cache->getSettings()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        $data = $request->validate([
            'performance_preset' => 'sometimes|string|in:aggressive,balanced,fresh',
            'page_cache' => 'sometimes|boolean',
            'object_cache' => 'sometimes|boolean',
            'browser_cache' => 'sometimes|boolean',
            'browser_cache_ttl' => 'sometimes|integer|min:60|max:604800',
            'cdn_html_cache' => 'sometimes|boolean',
            'cdn_auto_purge' => 'sometimes|boolean',
            'arvan_auto_purge' => 'sometimes|boolean',
            'cloudflare_auto_purge' => 'sometimes|boolean',
            'lazy_load_images' => 'sometimes|boolean',
            'lazy_load_chatbot' => 'sometimes|boolean',
            'defer_analytics' => 'sometimes|boolean',
            'defer_below_fold' => 'sometimes|boolean',
            'prefetch_links' => 'sometimes|boolean',
            'auto_purge_on_save' => 'sometimes|boolean',
            'warm_cache_after_purge' => 'sometimes|boolean',
            'gzip_enabled' => 'sometimes|boolean',
            'api_cache_ttl' => 'sometimes|integer|min:60|max:604800',
            'ttl_articles' => 'sometimes|integer|min:60|max:604800',
            'ttl_cases' => 'sometimes|integer|min:60|max:604800',
            'ttl_doctors' => 'sometimes|integer|min:60|max:604800',
            'ttl_services' => 'sometimes|integer|min:60|max:604800',
            'ttl_settings' => 'sometimes|integer|min:60|max:604800',
            'ttl_pricing' => 'sometimes|integer|min:60|max:604800',
            'ttl_home' => 'sometimes|integer|min:60|max:604800',
        ]);

        return response()->json(['data' => $this->cache->updateSettings($data)]);
    }

    public function developerMode(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        $validated = $request->validate([
            'enable' => 'required|boolean',
        ]);

        $user = $request->user();
        $actor = $user?->email ?? $user?->name ?? 'admin';

        return response()->json([
            'data' => $this->cache->setDeveloperMode($validated['enable'], $actor),
        ]);
    }

    public function purge(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        $validated = $request->validate([
            'scope' => 'required|string|max:120',
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:64',
            'paths' => 'sometimes|array',
            'paths.*' => 'string|max:256',
            'warm' => 'sometimes|boolean',
        ]);

        $user = $request->user();
        $actor = $user?->email ?? $user?->name ?? 'admin';

        $result = $this->cache->purge(
            $validated['scope'],
            [
                'tags' => $validated['tags'] ?? [],
                'paths' => $validated['paths'] ?? [],
                'warm' => $validated['warm'] ?? false,
            ],
            $actor,
        );

        return response()->json(['data' => $result]);
    }

    public function clearPurgeLog(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        $this->cache->clearPurgeLog();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function integrations(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        return response()->json(['data' => $this->cache->integrationsAdminView()]);
    }

    public function updateIntegrations(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        $data = $request->validate([
            'revalidate_webhook_url' => 'sometimes|nullable|string|max:512',
            'revalidate_secret_input' => 'sometimes|nullable|string|max:256',
            'cloudflare_zone_id' => 'sometimes|nullable|string|max:64',
            'cloudflare_api_token_input' => 'sometimes|nullable|string|max:256',
            'arvan_domain' => 'sometimes|nullable|string|max:128',
            'arvan_media_domain' => 'sometimes|nullable|string|max:128',
            'arvan_api_key_input' => 'sometimes|nullable|string|max:256',
            'cdn_provider' => 'sometimes|nullable|string|in:arvan,cloudflare,none',
        ]);

        return response()->json(['data' => $this->cache->updateIntegrations($data)]);
    }

    public function testIntegrations(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.manage'), 403);

        $validated = $request->validate([
            'target' => 'required|string|in:webhook,cloudflare,arvan',
        ]);

        $result = match ($validated['target']) {
            'webhook' => $this->cache->testWebhookIntegration(),
            'arvan' => $this->cache->testArvanIntegration(),
            default => $this->cache->testCloudflareIntegration(),
        };

        return response()->json(['data' => $result]);
    }

}
