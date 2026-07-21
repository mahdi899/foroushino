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

        if (array_key_exists('callback_url', $data)) {
            $callback = trim((string) ($data['callback_url'] ?? ''));
            if ($callback === '' || PaymentSetting::isUnreachableCallbackHost($callback)) {
                $data['callback_url'] = null;
            } else {
                $data['callback_url'] = $callback;
            }
        }

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
        $defaultCallback = PaymentSetting::defaultCallbackUrl();
        $storedCallback = trim((string) $settings->callback_url);
        $storedIsUsable = $storedCallback !== '' && ! PaymentSetting::isUnreachableCallbackHost($storedCallback);

        return [
            'sandbox_mode' => $settings->sandbox_mode,
            'callback_url' => $storedIsUsable ? $settings->callback_url : null,
            'is_active' => $settings->is_active,
            'currency' => $settings->currency ?? 'IRT',
            'description_template' => $settings->description_template,
            'has_merchant_id' => filled($settings->zarinpal_merchant_id),
            'default_callback_url' => $defaultCallback,
            'effective_callback_url' => $settings->resolvedCallbackUrl(),
            'uses_custom_callback' => $storedIsUsable && $storedCallback !== $defaultCallback,
            'app_url' => rtrim((string) config('app.url'), '/'),
            'frontend_payment_result_url' => rtrim((string) config('app.frontend_url'), '/').'/payment/result',
        ];
    }
}
