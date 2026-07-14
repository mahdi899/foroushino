<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('admin.settings');
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
            'settings.lead_pool_auto_return_hours' => ['sometimes', 'integer', 'min:1', 'max:720'],
            'settings.payout_minimum_amount' => ['sometimes', 'integer', 'min:0'],
            'settings.*' => ['nullable'],
        ];
    }
}
