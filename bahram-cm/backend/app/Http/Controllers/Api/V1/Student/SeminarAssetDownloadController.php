<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\SeminarAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Reachable only via a short-lived signed URL (see SeminarController::show).
 * Seminar assets are never exposed as public/direct links.
 */
class SeminarAssetDownloadController extends Controller
{
    public function __invoke(Request $request, SeminarAsset $asset)
    {
        abort_unless($request->hasValidSignature(), 403);
        abort_if(filled($asset->external_url) || blank($asset->path), 404);

        $disk = Storage::disk('local');
        abort_unless($disk->exists($asset->path), 404);

        if ($asset->is_downloadable) {
            return $disk->download($asset->path, $asset->title);
        }

        return response()->file($disk->path($asset->path));
    }
}
