<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ImageOptimizerSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImageOptimizerSettingsController extends Controller
{
    public function __construct(private readonly ImageOptimizerSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->settings->adminView()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tinify_key_input' => ['nullable', 'string', 'max:500'],
            'resmush_enabled' => ['nullable', 'boolean'],
            'resmush_quality' => ['nullable', 'integer', 'min:0', 'max:100'],
            'resmush_referer' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json(['data' => $this->settings->update($validated)]);
    }

    public function test(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target' => ['required', 'string', 'in:tinify,resmush'],
        ]);

        $result = $validated['target'] === 'tinify'
            ? $this->settings->testTinify()
            : $this->settings->testResmush();

        return response()->json(['data' => $result]);
    }
}
