<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
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
            // Honeypot field: real users never fill this hidden input.
            'website' => ['prohibited'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (blank($this->input('name')) && blank($this->input('phone')) && blank($this->input('email'))) {
                $validator->errors()->add('name', 'حداقل یکی از فیلدهای نام، شماره تماس یا ایمیل باید تکمیل شود.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'website.prohibited' => 'درخواست نامعتبر است.',
        ];
    }
}
