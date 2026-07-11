<?php

namespace App\Http\Requests\V1;

use App\Http\Requests\Concerns\RequiresCaptcha;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class AdminSendOtpRequest extends FormRequest
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

    public function messages(): array
    {
        return [
            'website' => 'درخواست نامعتبر است.',
        ];
    }
}
