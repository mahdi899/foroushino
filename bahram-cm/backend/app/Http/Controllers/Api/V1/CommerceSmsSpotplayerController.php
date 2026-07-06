<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SmsSetting;
use App\Models\SpotplayerSetting;
use App\Services\SmsService;
use App\Services\SpotPlayerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommerceSmsSpotplayerController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->payload()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sms_provider' => ['sometimes', 'string', 'max:50'],
            'sms_api_key' => ['sometimes', 'nullable', 'string', 'max:500'],
            'sms_sender_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'sms_pattern_code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_sms_active' => ['sometimes', 'boolean'],
            'test_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'purchase_message_template' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'spotplayer_api_key' => ['sometimes', 'nullable', 'string', 'max:500'],
            'spotplayer_base_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'is_spotplayer_active' => ['sometimes', 'boolean'],
            'default_license_duration' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ]);

        $sms = SmsSetting::current();
        $spot = SpotplayerSetting::current();

        $smsData = array_intersect_key($data, array_flip([
            'sms_provider', 'sms_api_key', 'sms_sender_number', 'sms_pattern_code',
            'is_sms_active', 'test_phone', 'purchase_message_template',
        ]));

        $spotData = array_intersect_key($data, array_flip([
            'spotplayer_api_key', 'spotplayer_base_url', 'is_spotplayer_active', 'default_license_duration',
        ]));

        if (array_key_exists('sms_api_key', $smsData) && blank($smsData['sms_api_key'])) {
            unset($smsData['sms_api_key']);
        }

        if (array_key_exists('spotplayer_api_key', $spotData) && blank($spotData['spotplayer_api_key'])) {
            unset($spotData['spotplayer_api_key']);
        }

        if ($smsData !== []) {
            $sms->update($smsData);
        }

        if ($spotData !== []) {
            $spot->update($spotData);
        }

        return response()->json(['data' => $this->payload()]);
    }

    public function testSms(): JsonResponse
    {
        $phone = SmsSetting::current()->test_phone;

        if (blank($phone)) {
            return response()->json(['ok' => false, 'message' => 'برای تست، ابتدا شماره تست پیش‌فرض را وارد کنید.'], 422);
        }

        $result = app(SmsService::class)->sendTest($phone);

        return response()->json([
            'ok' => $result['success'],
            'message' => $result['message'],
        ], $result['success'] ? 200 : 422);
    }

    public function testSpotplayer(): JsonResponse
    {
        $result = app(SpotPlayerService::class)->testConnection();

        return response()->json([
            'ok' => $result['success'],
            'message' => $result['message'],
        ], $result['success'] ? 200 : 422);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $sms = SmsSetting::current();
        $spot = SpotplayerSetting::current();

        return [
            'sms_provider' => $sms->sms_provider ?? 'kavenegar',
            'sms_sender_number' => $sms->sms_sender_number,
            'sms_pattern_code' => $sms->sms_pattern_code,
            'is_sms_active' => $sms->is_sms_active,
            'test_phone' => $sms->test_phone,
            'purchase_message_template' => $sms->purchase_message_template,
            'has_sms_api_key' => filled($sms->sms_api_key),
            'spotplayer_base_url' => $spot->spotplayer_base_url,
            'is_spotplayer_active' => $spot->is_spotplayer_active,
            'default_license_duration' => $spot->default_license_duration,
            'has_spotplayer_api_key' => filled($spot->spotplayer_api_key),
        ];
    }
}
