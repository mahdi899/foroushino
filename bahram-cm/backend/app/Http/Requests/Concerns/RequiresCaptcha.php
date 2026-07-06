<?php

namespace App\Http\Requests\Concerns;

use App\Services\CaptchaService;
use Illuminate\Contracts\Validation\Validator;

trait RequiresCaptcha
{
    /**
     * @return 'newsletter'|'leads'|'admin_login'
     */
    protected function captchaFormKey(): string
    {
        return 'leads';
    }

    protected function honeypotField(): string
    {
        return 'website';
    }

    /**
     * @return array<string, mixed>
     */
    protected function captchaRules(): array
    {
        return [
            'captcha_token' => ['nullable', 'string'],
            'captcha_id' => ['nullable', 'uuid'],
            'captcha_answer' => ['nullable'],
            $this->honeypotField() => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function appendCaptchaValidation(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var CaptchaService $captcha */
            $captcha = app(CaptchaService::class);

            if ($captcha->isHoneypotEnabled()) {
                $honeypot = $this->input($this->honeypotField());
                if ($honeypot !== null && trim((string) $honeypot) !== '') {
                    $validator->errors()->add($this->honeypotField(), 'درخواست نامعتبر است.');

                    return;
                }
            }

            if (! $captcha->isFormProtected($this->captchaFormKey())) {
                return;
            }

            $token = $this->input('captcha_token');
            $mathId = $this->input('captcha_id');
            $mathAnswer = $this->input('captcha_answer');

            if (! $token && (! $mathId || $mathAnswer === null || $mathAnswer === '')) {
                $validator->errors()->add('captcha', 'تأیید امنیتی الزامی است.');

                return;
            }

            $valid = $captcha->verify(
                token: is_string($token) ? $token : null,
                mathId: is_string($mathId) ? $mathId : null,
                mathAnswer: $mathAnswer,
                ip: $this->ip(),
            );

            if (! $valid) {
                $validator->errors()->add('captcha', 'تأیید امنیتی ناموفق بود. لطفاً دوباره تلاش کنید.');
            }
        });
    }
}
