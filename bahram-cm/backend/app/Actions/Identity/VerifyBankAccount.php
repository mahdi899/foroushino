<?php

namespace App\Actions\Identity;

use App\Enums\IdentityCapability;
use App\Enums\IdentityVerificationStatus;
use App\Enums\OwnershipVerificationResult;
use App\Models\IdentityVerificationAttempt;
use App\Models\User;
use App\Models\VerifiedBankAccount;
use App\Services\Identity\Contracts\FinancialOwnershipVerificationProvider;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use App\Services\ReferralService;
use App\Support\JalaliDate;
use App\Support\NationalCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VerifyBankAccount
{
    public function __construct(
        private readonly EnsureIdentityProfile $ensureProfile,
        private readonly IdentityVerificationProviderRegistry $registry,
        private readonly ReferralService $referrals,
    ) {}

    /**
     * @return array{account: VerifiedBankAccount, result: OwnershipVerificationResult, attempt: ?IdentityVerificationAttempt}
     */
    public function __invoke(
        User $user,
        ?string $cardNumber,
        ?string $iban,
        ?string $holderName = null,
    ): array {
        $cardDigits = preg_replace('/\D/', '', (string) $cardNumber) ?? '';
        $ibanNormalized = strtoupper(preg_replace('/\s+/', '', (string) $iban) ?? '');

        if ($cardDigits === '' && $ibanNormalized === '') {
            throw ValidationException::withMessages([
                'account' => ['شماره کارت یا شبا الزامی است.'],
            ]);
        }

        return DB::transaction(function () use ($user, $cardDigits, $ibanNormalized, $holderName) {
            $profile = ($this->ensureProfile)($user);

            if ($profile->identity_status !== IdentityVerificationStatus::Approved) {
                throw ValidationException::withMessages([
                    'identity' => ['ابتدا باید هویت شما تأیید شود.'],
                ]);
            }

            $nationalCode = NationalCode::decrypt($profile->national_code_encrypted);
            $birthDate = $profile->date_of_birth;

            if (! $nationalCode || ! $birthDate) {
                throw ValidationException::withMessages([
                    'identity' => ['اطلاعات هویت (کد ملی یا تاریخ تولد) ناقص است.'],
                ]);
            }

            $jalaliBirthDate = JalaliDate::formatApi($birthDate);
            $summary = $this->referrals->summary($user);
            $fee = (int) config('bahram.withdrawal.verification_fee', 7_000);

            if ($summary['payable_amount'] <= 0) {
                throw ValidationException::withMessages([
                    'balance' => ['ثبت کارت بانکی فقط پس از داشتن موجودی قابل‌برداشت از همکاری در فروش امکان‌پذیر است.'],
                ]);
            }

            if ($summary['payable_amount'] < $fee) {
                throw ValidationException::withMessages([
                    'balance' => ['موجودی کافی برای پرداخت کارمزد احراز ('.number_format($fee).' تومان) وجود ندارد.'],
                ]);
            }

            if ($cardDigits !== '') {
                $duplicateCard = VerifiedBankAccount::query()
                    ->where('user_id', $user->id)
                    ->where('card_last4', substr($cardDigits, -4))
                    ->whereNotNull('verified_at')
                    ->exists();

                if ($duplicateCard) {
                    throw ValidationException::withMessages([
                        'card_number' => ['این شماره کارت قبلاً ثبت و تأیید شده است.'],
                    ]);
                }
            }

            if ($ibanNormalized !== '') {
                $duplicateIban = VerifiedBankAccount::query()
                    ->where('user_id', $user->id)
                    ->where('iban_last4', substr($ibanNormalized, -4))
                    ->whereNotNull('verified_at')
                    ->exists();

                if ($duplicateIban) {
                    throw ValidationException::withMessages([
                        'iban' => ['این شماره شبا قبلاً ثبت و تأیید شده است.'],
                    ]);
                }
            }

            $capability = $cardDigits !== ''
                ? IdentityCapability::CardNationalCodeMatch
                : IdentityCapability::IbanNationalCodeMatch;

            $hasDefault = VerifiedBankAccount::query()
                ->where('user_id', $user->id)
                ->where('is_default', true)
                ->exists();

            // Whole feature is administratively off (no financial provider configured
            // for this capability) — fall back to manual admin approval instead of
            // rejecting the user outright.
            if (! $this->anyFinancialProviderConfigured()) {
                $account = new VerifiedBankAccount([
                    'user_id' => $user->id,
                    'holder_name' => $holderName,
                    // Fee is charged only once an admin approves the pending account.
                    'verification_fee' => 0,
                    'provider' => null,
                    'status' => 'pending',
                    'is_default' => ! $hasDefault,
                ]);
                $account->setCardNumber($cardDigits !== '' ? $cardDigits : null);
                $account->setIban($ibanNormalized !== '' ? $ibanNormalized : null);
                $account->save();

                return [
                    'account' => $account->fresh(),
                    'result' => OwnershipVerificationResult::Pending,
                    'attempt' => null,
                ];
            }

            if ($cardDigits !== '') {
                $providerOutcome = $this->registry->resolveForCapability(
                    $capability,
                    fn ($provider) => $provider->verifyCard($cardDigits, $nationalCode, $jalaliBirthDate),
                );
            } else {
                $providerOutcome = $this->registry->resolveForCapability(
                    $capability,
                    fn ($provider) => $provider->verifyIban($ibanNormalized, $nationalCode, $jalaliBirthDate),
                );
            }

            $result = $providerOutcome['result'];
            $provider = $providerOutcome['provider'];
            $route = $providerOutcome['route'];

            $attemptNumber = (int) IdentityVerificationAttempt::query()
                ->where('user_id', $user->id)
                ->where('capability', $capability)
                ->count() + 1;

            $attempt = IdentityVerificationAttempt::query()->create([
                'user_id' => $user->id,
                'capability' => $capability,
                'provider' => $provider->slug(),
                'route_id' => $route?->id ? (string) $route->id : null,
                'status' => $result->normalized_result->value,
                'normalized_result' => $result->normalized_result,
                'provider_code' => $result->provider_code,
                'provider_message' => $result->provider_message,
                'provider_request_id' => $result->provider_request_id,
                'attempt_number' => $attemptNumber,
                'duration_ms' => $result->duration_ms,
                'requested_at' => now(),
                'completed_at' => now(),
            ]);

            if ($result->normalized_result !== OwnershipVerificationResult::Matched) {
                $message = match ($result->normalized_result) {
                    OwnershipVerificationResult::Mismatched => 'شماره کارت یا شبا با اطلاعات هویتی شما (کد ملی و تاریخ تولد) مطابقت ندارد.',
                    OwnershipVerificationResult::RateLimited => 'تعداد درخواست‌ها بیش از حد است. کمی بعد تلاش کنید.',
                    default => 'سرویس تطبیق موقتاً در دسترس نیست. بعداً تلاش کنید.',
                };

                throw ValidationException::withMessages([
                    'verification' => [$message],
                ]);
            }

            $bankName = null;
            $resolvedHolder = $holderName;
            $resolvedIban = $ibanNormalized !== '' ? $ibanNormalized : null;

            if ($cardDigits !== '' && $provider instanceof FinancialOwnershipVerificationProvider) {
                $inquiry = $provider->inquireCard($cardDigits);
                if ($inquiry) {
                    $resolvedIban ??= is_string($inquiry['iban'] ?? null) ? $inquiry['iban'] : null;
                    $bankName = is_string($inquiry['bank_name'] ?? null) ? $inquiry['bank_name'] : null;
                    if (blank($resolvedHolder) && filled($inquiry['holder_name'] ?? null)) {
                        $resolvedHolder = $inquiry['holder_name'];
                    }
                }
            }

            $account = new VerifiedBankAccount([
                'user_id' => $user->id,
                'bank_name' => $bankName,
                'holder_name' => $resolvedHolder,
                'verification_fee' => $fee,
                'provider' => $provider->slug(),
                'status' => 'verified',
                'verified_at' => now(),
                'is_default' => ! $hasDefault,
            ]);
            $account->setCardNumber($cardDigits !== '' ? $cardDigits : null);
            $account->setIban($resolvedIban);
            $account->save();

            return [
                'account' => $account->fresh(),
                'result' => $result->normalized_result,
                'attempt' => $attempt,
            ];
        });
    }

    private function anyFinancialProviderConfigured(): bool
    {
        foreach ($this->registry->all() as $provider) {
            if ($provider instanceof FinancialOwnershipVerificationProvider && $provider->isConfigured()) {
                return true;
            }
        }

        return false;
    }
}
