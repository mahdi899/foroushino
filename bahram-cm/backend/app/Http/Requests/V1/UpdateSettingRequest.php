<?php

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('settings.write');
    }

    public function rules(): array
    {
        return [
            'values' => ['required', 'array'],
        ];
    }
}
