<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MediaAltResolver;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaAltController extends Controller
{
    public function __construct(private readonly MediaAltResolver $resolver)
    {
    }

    /**
     * Public lookup — alt text for a portable media reference (/storage/..., /images/...).
     */
    public function show(Request $request): JsonResponse
    {
        $ref = trim((string) $request->query('ref', ''));
        if ($ref === '') {
            return ApiResponse::error('invalid_ref', 'مسیر تصویر الزامی است.', 422);
        }

        $alt = $this->resolver->resolve($ref);

        return response()->json([
            'data' => [
                'ref' => $ref,
                'alt_fa' => $alt,
            ],
        ]);
    }
}
