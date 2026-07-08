<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SmsSpotplayerCredentialsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsSpotplayerCredentialsController extends Controller
{
    public function __construct(private readonly SmsSpotplayerCredentialsService $settings) {}

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->settings->adminView()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'melipayamak_username' => ['nullable', 'string', 'max:200'],
            'melipayamak_password_input' => ['nullable', 'string', 'max:200'],
            'melipayamak_sender_number' => ['nullable', 'string', 'max:50'],
            'melipayamak_active' => ['sometimes', 'boolean'],
            'kavenegar_api_key_input' => ['nullable', 'string', 'max:500'],
            'kavenegar_sender_number' => ['nullable', 'string', 'max:50'],
            'kavenegar_active' => ['sometimes', 'boolean'],
            'spotplayer_api_key_input' => ['nullable', 'string', 'max:500'],
            'spotplayer_base_url' => ['nullable', 'string', 'max:500'],
            'is_spotplayer_active' => ['sometimes', 'boolean'],
            'default_license_duration' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ]);

        return response()->json(['data' => $this->settings->update($validated)]);
    }

    public function test(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target' => ['required', 'string', 'in:melipayamak,kavenegar,spotplayer'],
        ]);

        $result = match ($validated['target']) {
            'melipayamak' => $this->settings->testMelipayamak(),
            'kavenegar' => $this->settings->testKavenegar(),
            default => $this->settings->testSpotplayer(),
        };

        return response()->json(['data' => $result]);
    }
}
