<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashbackPayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'card_number' => ['prohibited'],
            'verified_bank_account_id' => ['required', 'integer', 'exists:verified_bank_accounts,id'],
            'card_holder_name' => ['prohibited'],
        ];
    }
}
