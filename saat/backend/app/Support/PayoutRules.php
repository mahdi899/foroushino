<?php



namespace App\Support;



use RuntimeException;



final class PayoutRules

{

    private const BANK_FEE_RATE = 0.0001;



    private const BANK_FEE_FIXED = 400;



    private const BANK_FEE_MIN = 500;



    private const BANK_FEE_MAX = 10_000;



    public static function minAmount(): int

    {

        return (int) config('wallet.payout.min_amount', 100_000);

    }



    public static function stepAmount(): int

    {

        return (int) config('wallet.payout.step_amount', 1_000);

    }



    public static function calculateBankFee(float $amount): int

    {

        if ($amount <= 0) {

            return 0;

        }



        $raw = ($amount * self::BANK_FEE_RATE) + self::BANK_FEE_FIXED;

        $rounded = (int) (round($raw / 100) * 100);

        return (int) min(self::BANK_FEE_MAX, max(self::BANK_FEE_MIN, $rounded));

    }



    public static function netAmount(float $amount): float

    {

        return max(0, $amount - self::calculateBankFee($amount));

    }



    public static function isStepCompliant(float $amount, float $balanceAvailable): bool

    {

        if (abs($amount - $balanceAvailable) < 0.001) {

            return true;

        }



        return fmod($amount, self::stepAmount()) == 0.0;

    }



    /**

     * @throws RuntimeException

     */

    public static function assertValid(float $amount, float $balanceAvailable): void

    {

        if ($amount <= 0) {

            throw new RuntimeException('مبلغ نامعتبر است.');

        }



        if ($amount > $balanceAvailable) {

            throw new RuntimeException('مبلغ درخواستی بیشتر از موجودی قابل برداشت است.');

        }



        $min = self::minAmount();

        if ($amount < $min) {

            throw new RuntimeException('حداقل مبلغ برداشت '.number_format($min).' تومان است.');

        }



        if (! self::isStepCompliant($amount, $balanceAvailable)) {

            throw new RuntimeException('مبلغ برداشت باید مضربی از '.number_format(self::stepAmount()).' تومان باشد.');

        }



        $fee = self::calculateBankFee($amount);

        if ($amount <= $fee) {

            throw new RuntimeException('مبلغ باید بیشتر از کارمزد بانکی باشد.');

        }

    }

}

