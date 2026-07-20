<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\MediaHostSettingsService;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;

class MediaConfigController extends Controller
{
    /** Public media URL configuration (CDN / storage host). */
    public function config(): JsonResponse
    {
        $hosts = app(MediaHostSettingsService::class);

        return response()->json([
            'media_url' => $hosts->mediaUrl(),
            'family_media_cdn_url' => $hosts->familyMediaCdnUrl(),
            'upload_url' => MediaUrl::uploadOrigin(),
            'site_url' => MediaUrl::siteOrigin(),
            'storage_layout' => 'media/YYYY/MM/{ulid}.ext',
        ]);
    }
}
