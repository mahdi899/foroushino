<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Http\Controllers\Controller;
use App\Models\FamilyMedia;
use App\Services\AdminAuditLogger;
use App\Services\AIService;
use App\Services\Family\FamilyAiSettingsService;
use App\Services\Family\FamilyBrandingService;
use App\Services\Family\FamilyMediaSettingsService;
use App\Support\Ai\AiProviderCatalog;
use App\Support\ApiResponse;
use App\Support\FamilyMediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    public function __construct(
        private readonly FamilyBrandingService $branding,
        private readonly AdminAuditLogger $audit,
        private readonly FamilyMediaSettingsService $mediaSettings,
        private readonly FamilyAiSettingsService $aiSettings,
    ) {}

    public function show(): JsonResponse
    {
        $branding = $this->branding->get();
        $version = $branding->updated_at?->getTimestamp();

        return ApiResponse::success([
            'display_name' => $branding->display_name,
            'profile_name' => $branding->profile_name,
            'profile_avatar' => FamilyMediaUrl::withCacheBuster(
                FamilyMediaUrl::fromPath($branding->profile_avatar_path),
                $version,
            ),
            'community_avatar' => FamilyMediaUrl::withCacheBuster(
                FamilyMediaUrl::fromPath($branding->community_avatar_path),
                $version,
            ),
            'profile_avatar_path' => $branding->profile_avatar_path,
            'community_avatar_path' => $branding->community_avatar_path,
            'branding_version' => $version,
            'media_pipeline' => $this->mediaSettings->adminView(),
            'ai' => $this->aiSettings->adminView(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'display_name' => ['required', 'string', 'max:120'],
            'profile_name' => ['required', 'string', 'max:80'],
            'profile_avatar_path' => ['nullable', 'string', 'max:500'],
            'community_avatar_path' => ['nullable', 'string', 'max:500'],
            'profile_media_id' => ['nullable', 'integer', 'exists:family_media,id'],
            'community_media_id' => ['nullable', 'integer', 'exists:family_media,id'],
        ]);

        $payload = [
            'display_name' => $data['display_name'],
            'profile_name' => $data['profile_name'],
        ];

        if (array_key_exists('profile_media_id', $data)) {
            $payload['profile_avatar_path'] = $this->mediaPath($data['profile_media_id']);
        } elseif (array_key_exists('profile_avatar_path', $data)) {
            $payload['profile_avatar_path'] = $data['profile_avatar_path'];
        }

        if (array_key_exists('community_media_id', $data)) {
            $payload['community_avatar_path'] = $this->mediaPath($data['community_media_id']);
        } elseif (array_key_exists('community_avatar_path', $data)) {
            $payload['community_avatar_path'] = $data['community_avatar_path'];
        }

        $updated = $this->branding->update($payload);
        $this->audit->log($request->user(), 'family.branding_updated', $updated);
        $version = $updated->updated_at?->getTimestamp();

        return ApiResponse::success([
            'display_name' => $updated->display_name,
            'profile_name' => $updated->profile_name,
            'profile_avatar' => FamilyMediaUrl::withCacheBuster(
                FamilyMediaUrl::fromPath($updated->profile_avatar_path),
                $version,
            ),
            'community_avatar' => FamilyMediaUrl::withCacheBuster(
                FamilyMediaUrl::fromPath($updated->community_avatar_path),
                $version,
            ),
            'profile_avatar_path' => $updated->profile_avatar_path,
            'community_avatar_path' => $updated->community_avatar_path,
            'branding_version' => $version,
            'media_pipeline' => $this->mediaSettings->adminView(),
            'ai' => $this->aiSettings->adminView(),
        ]);
    }

    public function updateMediaPipeline(Request $request): JsonResponse
    {
        $data = $request->validate([
            'optimize_images' => ['nullable', 'boolean'],
            'sync_to_site_library' => ['nullable', 'boolean'],
            'ftp_upload_enabled' => ['nullable', 'boolean'],
        ]);

        $this->mediaSettings->update($data);
        $this->audit->log($request->user(), 'family.media_pipeline_updated', null, $data);

        return ApiResponse::success($this->mediaSettings->adminView());
    }

    public function updateAi(Request $request): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['nullable', 'boolean'],
            'provider_name' => ['nullable', 'string', Rule::in(AiProviderCatalog::ids())],
            'base_url' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:120'],
            'temperature' => ['nullable', 'numeric', 'min:0', 'max:2'],
            'max_tokens' => ['nullable', 'integer', 'min:100', 'max:8000'],
            'api_key' => ['nullable', 'string', 'max:500'],
            'clear_api_key' => ['nullable', 'boolean'],
            'auto_approve_comments' => ['nullable', 'boolean'],
            'auto_reject_high_risk' => ['nullable', 'boolean'],
            'risk_approve_threshold' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'risk_reject_threshold' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'default_action_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $this->aiSettings->update($data);
        $this->audit->log($request->user(), 'family.ai_settings_updated', null, array_keys($data));

        return ApiResponse::success($this->aiSettings->adminView());
    }

    public function testAi(Request $request, AIService $ai): JsonResponse
    {
        $data = $request->validate([
            'provider_name' => ['nullable', 'string', Rule::in(AiProviderCatalog::ids())],
            'base_url' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:120'],
            'temperature' => ['nullable', 'numeric', 'min:0', 'max:2'],
            'max_tokens' => ['nullable', 'integer', 'min:100', 'max:8000'],
            'api_key' => ['nullable', 'string', 'max:500'],
        ]);

        $settings = $this->resolveAiTestSettings($data);

        return ApiResponse::success($ai->testConnection($settings));
    }

    public function aiProviders(): JsonResponse
    {
        return ApiResponse::success([
            'providers' => AiProviderCatalog::publicCatalog(),
        ]);
    }

    private function mediaPath(?int $mediaId): ?string
    {
        if (! $mediaId) {
            return null;
        }

        return FamilyMedia::query()->findOrFail($mediaId)->storage_path;
    }

    /**
     * @param  array<string, mixed>  $draft
     */
    private function resolveAiTestSettings(array $draft): \App\Models\AiSetting
    {
        $current = \App\Models\AiSetting::current();
        $view = $this->aiSettings->adminView();

        $provider = (string) ($draft['provider_name'] ?? $view['provider_name'] ?? $current->provider_name ?? 'openai');
        if (! in_array($provider, AiProviderCatalog::ids(), true)) {
            $provider = 'openai';
        }

        $defaults = AiProviderCatalog::defaults($provider);
        $apiKey = filled($draft['api_key'] ?? null)
            ? (string) $draft['api_key']
            : (string) ($current->api_key ?? '');

        $current->forceFill([
            'provider_name' => $provider,
            'base_url' => (string) ($draft['base_url'] ?? $view['base_url'] ?? $defaults['base_url']),
            'model' => (string) ($draft['model'] ?? $view['model'] ?? $defaults['model']),
            'temperature' => (float) ($draft['temperature'] ?? $view['temperature'] ?? $current->temperature ?? 0.4),
            'max_tokens' => (int) ($draft['max_tokens'] ?? $view['max_tokens'] ?? $current->max_tokens ?? 1200),
            'api_key' => $apiKey,
            'is_active' => true,
        ]);

        return $current;
    }
}
