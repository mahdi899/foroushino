<?php

namespace App\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConfirmMediaOptimizeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->hasPermission('media.write');
    }

    public function rules(): array
    {
        return [
            'session_id' => ['required', 'uuid'],
            'variant' => ['required', Rule::in(['original', 'optimized'])],
            'alt_fa' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:60'],
        ];
    }
}
