<?php

namespace App\Http\Requests\Student;

use App\Http\Requests\Concerns\RequiresCaptcha;
use Illuminate\Foundation\Http\FormRequest;

class StoreSatApplicationRequest extends FormRequest
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
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'name' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'age' => ['nullable', 'integer', 'min:10', 'max:120'],
            ...$this->captchaRules(),
        ];
    }

    protected function captchaFormKey(): string
    {
        return 'leads';
    }

    public function withValidator($validator): void
    {
        $this->appendCaptchaValidation($validator);
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'نام را وارد کنید.',
            'last_name.required' => 'نام خانوادگی را وارد کنید.',
            'website' => 'درخواست نامعتبر است.',
        ];
    }

    public function resolvedName(): string
    {
        $legacy = trim((string) $this->input('name', ''));
        if ($legacy !== '') {
            return $legacy;
        }

        return trim($this->string('first_name').' '.$this->string('last_name'));
    }
}
