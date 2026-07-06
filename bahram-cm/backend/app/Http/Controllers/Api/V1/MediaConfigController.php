<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;

class MediaConfigController extends Controller
{
    /** Public media URL configuration (CDN / storage host). */
    public function config(): JsonResponse
    {
        return response()->json([
            'media_url' => MediaUrl::mediaOrigin(),
            'upload_url' => MediaUrl::uploadOrigin(),
            'site_url' => MediaUrl::siteOrigin(),
            'storage_layout' => 'media/YYYY/MM/{ulid}.ext',
        ]);
    }
}
