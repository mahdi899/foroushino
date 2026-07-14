<?php

namespace App\Http\Requests\V1\Wallet;

use App\Services\WalletService;
use App\Support\PayoutRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RequestPayoutRequest extends FormRequest
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
        $min = PayoutRules::minAmount();

        return [
            'amount' => ['required', 'numeric', 'min:'.$min],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $user = $this->user();
            if (! $user->bank_card) {
                $validator->errors()->add('amount', 'ابتدا شماره کارت و شبا را در بخش درآمد من ثبت کن.');

                return;
            }

            if (! $user->bank_sheba) {
                $validator->errors()->add('amount', 'ابتدا شماره شبا را در بخش درآمد من ثبت کن.');

                return;
            }

            if ($user->bank_card_confirmed_at === null) {
                $validator->errors()->add('amount', 'شماره کارت هنوز توسط ناظر تایید نشده است.');

                return;
            }

            $amount = (float) $this->input('amount');
            $wallet = app(WalletService::class)->ensureWallet($user);
            $balance = (float) $wallet->balance_available;

            if (! PayoutRules::isStepCompliant($amount, $balance)) {
                $step = number_format(PayoutRules::stepAmount());
                $validator->errors()->add('amount', "مبلغ برداشت باید مضربی از {$step} تومان باشد.");
            }

            $fee = PayoutRules::calculateBankFee($amount);
            if ($amount <= $fee) {
                $validator->errors()->add('amount', 'مبلغ باید بیشتر از کارمزد بانکی باشد.');
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $min = number_format(PayoutRules::minAmount());

        return [
            'amount.min' => "حداقل مبلغ برداشت {$min} تومان است.",
        ];
    }
}
