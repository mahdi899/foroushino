<?php

namespace App\Http\Requests\Student;

use App\Http\Requests\Concerns\RequiresCaptcha;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class LoginPasswordRequest extends FormRequest
{
    use RequiresCaptcha;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'mobile' => ['required', 'string', 'max:20'],
            'password' => ['required', 'string'],
            ...$this->captchaRules(),
        ];
    }

    protected function captchaFormKey(): string
    {
        return 'admin_login';
    }

    public function withValidator(Validator $validator): void
    {
        $this->appendCaptchaValidation($validator);
    }
}
