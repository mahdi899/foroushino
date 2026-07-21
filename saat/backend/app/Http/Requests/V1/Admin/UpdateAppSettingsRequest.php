<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateAppSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('admin.settings');
    }

    protected function prepareForValidation(): void
    {
        $settings = $this->input('settings');
        if (! is_array($settings)) {
            return;
        }

        foreach ($settings as $key => $value) {
            if ($value === '') {
                unset($settings[$key]);

                continue;
            }

            if (is_string($value) && is_numeric($value) && str_starts_with((string) $key, 'meli_pattern_')) {
                $settings[$key] = (int) $value;

                continue;
            }

            if (is_string($value) && is_numeric($value) && in_array($key, [
                'call_lock_minutes',
                'min_call_duration_sec',
                'lead_pool_auto_return_hours',
                'payout_minimum_amount',
                'qa_sample_percent',
            ], true)) {
                $settings[$key] = str_contains($value, '.') ? (float) $value : (int) $value;
            }
        }

        $this->merge(['settings' => $settings]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'settings' => ['required', 'array'],
            'settings.call_lock_minutes' => ['sometimes', 'integer', 'min:1', 'max:180'],
            'settings.min_call_duration_sec' => ['sometimes', 'integer', 'min:0', 'max:3600'],
            'settings.native_call_enabled' => ['sometimes', 'boolean'],
            'settings.voip_enabled' => ['sometimes', 'boolean'],
            'settings.default_call_method' => ['sometimes', 'string', 'in:native,voip'],
            'settings.voip_provider' => ['sometimes', 'string', 'max:50'],
            'settings.voip_fallback_to_native' => ['sometimes', 'boolean'],
            'settings.lead_pool_auto_return_hours' => ['sometimes', 'integer', 'min:1', 'max:720'],
            'settings.power_dial_default' => ['sometimes', 'boolean'],
            'settings.qa_sample_percent' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'settings.payout_minimum_amount' => ['sometimes', 'integer', 'min:0'],
            'settings.meli_pattern_course' => ['sometimes', 'integer', 'min:0'],
            'settings.meli_pattern_channel' => ['sometimes', 'integer', 'min:0'],
            'settings.meli_pattern_register' => ['sometimes', 'integer', 'min:0'],
            'settings.meli_pattern_payment' => ['sometimes', 'integer', 'min:0'],
            'settings.meli_pattern_custom' => ['sometimes', 'integer', 'min:0'],
            'settings.meli_pattern_login' => ['sometimes', 'integer', 'min:0'],
            'settings.meli_sms_link_course' => ['sometimes', 'nullable', 'string', 'max:500'],
            'settings.meli_sms_link_channel' => ['sometimes', 'nullable', 'string', 'max:500'],
            'settings.meli_sms_link_register' => ['sometimes', 'nullable', 'string', 'max:500'],
            'settings.meli_sms_link_payment' => ['sometimes', 'nullable', 'string', 'max:500'],
            'settings.melipayamak_username' => ['sometimes', 'nullable', 'string', 'max:120'],
            'settings.melipayamak_password' => ['sometimes', 'nullable', 'string', 'max:120'],
            'settings.melipayamak_rest_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'settings.bahram_callback_url' => ['sometimes', 'nullable', 'string', 'max:500', 'url'],
            'settings.bahram_callback_token' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.*' => ['nullable'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $settings = $this->input('settings', []);
            if (! is_array($settings)) {
                return;
            }

            foreach (array_keys($settings) as $key) {
                if (! is_string($key) || $key === '' || strlen($key) > 100) {
                    $validator->errors()->add('settings', 'کلید تنظیم نامعتبر است.');

                    return;
                }
            }
        });
    }
}
