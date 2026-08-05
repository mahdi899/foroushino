<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\RequiresCaptcha;
use App\Models\LandingPage;
use App\Models\Lead;
use App\Support\Mobile;
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
        // Landing lead-capture pages skip captcha/honeypot — keep friction off the public /l/{slug} form.
        if (! filled($this->input('landing_slug'))) {
            $this->appendCaptchaValidation($validator);
        }

        $validator->after(function ($validator) {
            $landingSlug = $this->input('landing_slug');

            if (filled($landingSlug)) {
                if (blank($this->input('name'))) {
                    $validator->errors()->add('name', 'نام الزامی است.');
                }

                $rawPhone = $this->input('phone');
                if (blank($rawPhone)) {
                    $validator->errors()->add('phone', 'شماره تماس الزامی است.');
                } else {
                    $digits = preg_replace('/\D/', '', (string) $rawPhone) ?? '';
                    if (! preg_match('/^0\d{10}$/', $digits)) {
                        $validator->errors()->add('phone', 'شماره باید ۱۱ رقم باشد و با ۰ شروع شود.');
                    } elseif (! Mobile::isValid(is_string($rawPhone) ? $rawPhone : null)) {
                        $validator->errors()->add('phone', 'شماره تماس معتبر وارد کن.');
                    }
                }

                $landingPage = LandingPage::query()
                    ->where('slug', $landingSlug)
                    ->where('is_published', true)
                    ->first();

                if (! $landingPage) {
                    $validator->errors()->add('landing_slug', 'صفحه لندینگ نامعتبر یا غیرفعال است.');

                    return;
                }

                $normalized = Mobile::normalize(is_string($rawPhone) ? $rawPhone : null);
                if ($normalized && $this->landingPhoneAlreadyRegistered($landingPage->id, $normalized)) {
                    $validator->errors()->add('phone', 'این شماره قبلاً در این صفحه ثبت شده است.');
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

    private function landingPhoneAlreadyRegistered(int $landingPageId, string $normalizedPhone): bool
    {
        $candidates = Lead::query()
            ->where('landing_page_id', $landingPageId)
            ->whereNotNull('phone')
            ->pluck('phone');

        foreach ($candidates as $stored) {
            if (! is_string($stored) || $stored === '') {
                continue;
            }
            if ($stored === $normalizedPhone) {
                return true;
            }
            if (Mobile::normalize($stored) === $normalizedPhone) {
                return true;
            }
        }

        return false;
    }
}
