<?php

namespace App\Http\Requests\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

class TelegramWidgetLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'id' => ['required', 'integer'],
            'first_name' => ['required', 'string'],
            'last_name' => ['nullable', 'string'],
            'username' => ['nullable', 'string'],
            'photo_url' => ['nullable', 'string'],
            'auth_date' => ['required', 'integer'],
            'hash' => ['required', 'string'],
        ];
    }
}
