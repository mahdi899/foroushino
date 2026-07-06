<?php

namespace App\Http\Requests\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

class DevLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) config('telegram.dev_login_enabled');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['nullable', 'string', 'email'],
            'role' => ['nullable', 'string'],
        ];
    }
}
