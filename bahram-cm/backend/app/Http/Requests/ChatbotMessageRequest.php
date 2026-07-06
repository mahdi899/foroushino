<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChatbotMessageRequest extends FormRequest
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
            'session_id' => ['required', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:2000'],
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
        ];
    }
}
