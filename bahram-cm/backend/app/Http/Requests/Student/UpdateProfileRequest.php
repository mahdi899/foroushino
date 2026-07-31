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
            'first_name' => ['sometimes', 'required_with:last_name', 'string', 'min:2', 'max:60'],
            'last_name' => ['sometimes', 'required_with:first_name', 'string', 'min:2', 'max:60'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'age' => ['sometimes', 'nullable', 'integer', 'min:10', 'max:120'],
            'current_job' => ['sometimes', 'nullable', 'string', 'max:120'],
            'instagram' => ['sometimes', 'nullable', 'string', 'max:120'],
            'telegram' => ['sometimes', 'nullable', 'string', 'max:120'],
            'experience_level' => ['sometimes', 'nullable', 'string', 'max:120'],
            'income_goal' => ['sometimes', 'nullable', 'string', 'max:120'],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:500'],
            'password' => ['sometimes', 'nullable', 'string', 'min:6', 'confirmed'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'first_name.required_with' => 'نام را وارد کنید.',
            'first_name.min' => 'نام باید حداقل ۲ حرف باشد.',
            'last_name.required_with' => 'نام خانوادگی را وارد کنید.',
            'last_name.min' => 'نام خانوادگی باید حداقل ۲ حرف باشد.',
        ];
    }
}
