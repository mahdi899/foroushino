<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\RequiresCaptcha;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Laravel\Sanctum\PersonalAccessToken;

class StoreContentCommentRequest extends FormRequest
{
    use RequiresCaptcha;

    public function authorize(): bool
    {
        return true;
    }

    protected function captchaFormKey(): string
    {
        return 'leads';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'author_name' => ['nullable', 'string', 'max:120'],
            'author_email' => ['nullable', 'email', 'max:255'],
            'body' => ['required', 'string', 'min:3', 'max:2000'],
            ...$this->captchaRules(),
        ];
    }

    public function withValidator($validator): void
    {
        // Logged-in students already verified phone OTP — skip captcha friction.
        if ($this->authenticatedStudent()) {
            return;
        }

        $this->appendCaptchaValidation($validator);
    }

    private function authenticatedStudent(): bool
    {
        $token = $this->bearerToken();
        if (! is_string($token) || $token === '') {
            return false;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;

        return $user instanceof User;
    }
}
