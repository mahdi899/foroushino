<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'first_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'age' => ['sometimes', 'nullable', 'integer', 'min:10', 'max:120'],
            'current_job' => ['sometimes', 'nullable', 'string', 'max:120'],
            'instagram' => ['sometimes', 'nullable', 'string', 'max:120'],
            'telegram' => ['sometimes', 'nullable', 'string', 'max:120'],
            'experience_level' => ['sometimes', 'nullable', 'string', 'max:120'],
            'income_goal' => ['sometimes', 'nullable', 'string', 'max:120'],
            'password' => ['sometimes', 'nullable', 'string', 'min:6', 'confirmed'],
        ];
    }
}
