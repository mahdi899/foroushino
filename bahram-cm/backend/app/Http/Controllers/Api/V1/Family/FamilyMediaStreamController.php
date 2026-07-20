<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Models\FamilyMedia;
use App\Services\Family\FamilyMediaStreamService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FamilyMediaStreamController extends Controller
{
    public function __construct(private readonly FamilyMediaStreamService $streams) {}

    /** Range-aware stream from FTP/public disk — correct MIME for in-browser playback. */
    public function show(Request $request, FamilyMedia $medium): StreamedResponse
    {
        $this->streams->assertStreamable($medium);

        return $this->streams->response($request, $medium);
    }
}
