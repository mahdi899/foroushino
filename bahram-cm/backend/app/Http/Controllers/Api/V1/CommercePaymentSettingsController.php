<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommercePaymentSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = PaymentSetting::current();

        return response()->json([
            'data' => $this->payload($settings),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'zarinpal_merchant_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sandbox_mode' => ['sometimes', 'boolean'],
            'callback_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
            'currency' => ['sometimes', 'string', 'in:IRT,IRR'],
            'description_template' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $settings = PaymentSetting::current();

        if (array_key_exists('zarinpal_merchant_id', $data) && blank($data['zarinpal_merchant_id'])) {
            unset($data['zarinpal_merchant_id']);
        }

        $settings->update($data);

        return response()->json(['data' => $this->payload($settings->fresh())]);
    }

    /** @return array<string, mixed> */
    private function payload(PaymentSetting $settings): array
    {
        return [
            'sandbox_mode' => $settings->sandbox_mode,
            'callback_url' => $settings->callback_url,
            'is_active' => $settings->is_active,
            'currency' => $settings->currency ?? 'IRT',
            'description_template' => $settings->description_template,
            'has_merchant_id' => filled($settings->zarinpal_merchant_id),
            'default_callback_url' => route('api.payments.zarinpal.callback'),
        ];
    }
}
