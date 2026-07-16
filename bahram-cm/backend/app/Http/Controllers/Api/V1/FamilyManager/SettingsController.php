<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Http\Controllers\Controller;
use App\Models\FamilyMedia;
use App\Services\AdminAuditLogger;
use App\Services\Family\FamilyBrandingService;
use App\Services\Family\FamilyMediaSettingsService;
use App\Support\ApiResponse;
use App\Support\FamilyMediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(
        private readonly FamilyBrandingService $branding,
        private readonly AdminAuditLogger $audit,
        private readonly FamilyMediaSettingsService $mediaSettings,
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

    private function mediaPath(?int $mediaId): ?string
    {
        if (! $mediaId) {
            return null;
        }

        return FamilyMedia::query()->findOrFail($mediaId)->storage_path;
    }
}
