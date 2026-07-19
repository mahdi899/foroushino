<?php

namespace App\Http\Requests\V1\Me;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $requiresCurrent = (bool) $this->user()?->phone_otp_exempt;

        return [
            'current_password' => [
                $requiresCurrent ? 'required' : 'nullable',
                'string',
                'max:128',
            ],
            'password' => ['required', 'string', 'confirmed', Password::min(12)->max(128)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required' => 'رمز عبور فعلی را وارد کن.',
            'password.required' => 'رمز عبور جدید را وارد کن.',
            'password.confirmed' => 'تکرار رمز عبور با رمز جدید یکسان نیست.',
        ];
    }
}
