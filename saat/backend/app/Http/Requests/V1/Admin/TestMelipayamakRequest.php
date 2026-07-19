<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Foundation\Http\FormRequest;

class TestMelipayamakRequest extends FormRequest
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
            'username' => ['sometimes', 'nullable', 'string', 'max:120'],
            'password' => ['sometimes', 'nullable', 'string', 'max:120'],
            'rest_url' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
