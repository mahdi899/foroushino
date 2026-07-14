<?php

namespace App\Http\Requests\V1\Wallet;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBankCardRequest extends FormRequest
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
            'bank_card' => ['required', 'string', 'regex:/^\d{16}$/'],
            'bank_sheba' => ['required', 'string', 'regex:/^\d{24}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'bank_card.regex' => 'شماره کارت باید ۱۶ رقم باشد.',
            'bank_sheba.regex' => 'شماره شبا باید ۲۴ رقم باشد (با یا بدون IR).',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('bank_card')) {
            $this->merge([
                'bank_card' => preg_replace('/\D/', '', (string) $this->input('bank_card')),
            ]);
        }

        if ($this->has('bank_sheba')) {
            $sheba = strtoupper(preg_replace('/\s+/', '', (string) $this->input('bank_sheba')));
            if (str_starts_with($sheba, 'IR')) {
                $sheba = substr($sheba, 2);
            }
            $this->merge(['bank_sheba' => preg_replace('/\D/', '', $sheba)]);
        }
    }
}
