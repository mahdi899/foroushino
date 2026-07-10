<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\RequiresCaptcha;
use Illuminate\Foundation\Http\FormRequest;

class StoreMiniCourseCommentRequest extends FormRequest
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
            'author_name' => ['required', 'string', 'max:120'],
            'author_email' => ['nullable', 'email', 'max:255'],
            'body' => ['required', 'string', 'min:3', 'max:2000'],
            ...$this->captchaRules(),
        ];
    }

    public function withValidator($validator): void
    {
        $this->appendCaptchaValidation($validator);
    }
}
