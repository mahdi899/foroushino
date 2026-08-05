<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\RequiresCaptcha;
use App\Models\LandingPage;
use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
    use RequiresCaptcha;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'source' => ['nullable', 'string', 'max:100'],
            'message' => ['nullable', 'string', 'max:2000'],
            'page_url' => ['nullable', 'string', 'max:500'],
            'landing_slug' => ['nullable', 'string', 'max:255'],
            ...$this->captchaRules(),
        ];
    }

    protected function captchaFormKey(): string
    {
        return $this->input('source') === 'web_newsletter' ? 'newsletter' : 'leads';
    }

    public function withValidator($validator): void
    {
        $this->appendCaptchaValidation($validator);

        $validator->after(function ($validator) {
            $landingSlug = $this->input('landing_slug');

            if (filled($landingSlug)) {
                if (blank($this->input('name'))) {
                    $validator->errors()->add('name', 'نام الزامی است.');
                }
                if (blank($this->input('phone'))) {
                    $validator->errors()->add('phone', 'شماره تماس الزامی است.');
                }
                if (! LandingPage::where('slug', $landingSlug)->where('is_published', true)->exists()) {
                    $validator->errors()->add('landing_slug', 'صفحه لندینگ نامعتبر یا غیرفعال است.');
                }

                return;
            }

            if (blank($this->input('name')) && blank($this->input('phone')) && blank($this->input('email'))) {
                $validator->errors()->add('name', 'حداقل یکی از فیلدهای نام، شماره تماس یا ایمیل باید تکمیل شود.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'website' => 'درخواست نامعتبر است.',
        ];
    }
}
