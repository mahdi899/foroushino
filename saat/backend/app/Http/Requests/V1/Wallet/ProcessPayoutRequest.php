<?php

namespace App\Http\Requests\V1\Wallet;

use Illuminate\Foundation\Http\FormRequest;

class ProcessPayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('wallet.manage-payouts');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required_if:action,reject', 'nullable', 'string', 'max:500'],
        ];
    }
}
