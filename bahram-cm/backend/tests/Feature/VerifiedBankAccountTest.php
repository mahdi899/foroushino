<?php

namespace Tests\Feature;

use App\Actions\Identity\EnsureIdentityProfile;
use App\Actions\Identity\VerifyBankAccount;
use App\Enums\IdentityCapability;
use App\Enums\IdentityVerificationStatus;
use App\Enums\OwnershipVerificationResult;
use App\Enums\ReferralConversionStatus;
use App\Models\IdentityVerificationRoute;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReferralConversion;
use App\Models\User;
use App\Models\VerifiedBankAccount;
use App\Services\Identity\Contracts\FinancialOwnershipVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use App\Support\NationalCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VerifiedBankAccountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\IdentityProviderSeeder::class);
    }

    public function test_bank_account_verification_requires_minimum_balance(): void
    {
        $student = $this->makeLevel2Student();
        $this->seedApprovedCashback($student, 50_000);
        $this->bindFakeFinancialProvider(OwnershipVerificationResult::Matched);

        Sanctum::actingAs($student);

        $this->postJson('/api/v1/student/verified-bank-accounts', [
            'card_number' => '6037991234567890',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'bank_verification_failed');
    }

    public function test_matched_card_is_saved_and_fee_is_deducted_from_payable(): void
    {
        $student = $this->makeLevel2Student();
        $this->seedApprovedCashback($student, 150_000);
        $this->bindFakeFinancialProvider(OwnershipVerificationResult::Matched);

        Sanctum::actingAs($student);

        $this->postJson('/api/v1/student/verified-bank-accounts', [
            'card_number' => '6037991234567890',
        ])
            ->assertCreated()
            ->assertJsonPath('data.masked_card_number', '6037 **** **** 7890');

        $this->assertDatabaseHas('verified_bank_accounts', [
            'user_id' => $student->id,
            'verification_fee' => 7_000,
        ]);

        $summary = $this->getJson('/api/v1/student/referrals')
            ->assertOk()
            ->json('data.summary');

        $this->assertSame(143_000, (int) $summary['payable_amount']);
        $this->assertSame(7_000, (int) $summary['verification_fees']);
    }

    public function test_cashback_payout_requires_verified_bank_account(): void
    {
        $student = $this->makeLevel2Student();
        $this->seedApprovedCashback($student, 120_000);
        $other = $this->makeLevel2Student('09123334455');
        $otherAccount = VerifiedBankAccount::query()->create([
            'user_id' => $other->id,
            'verification_fee' => 0,
            'verified_at' => now(),
        ]);
        $otherAccount->setCardNumber('6037991234567891');
        $otherAccount->save();

        Sanctum::actingAs($student);

        $this->postJson('/api/v1/student/cashback-payouts', [
            'verified_bank_account_id' => $otherAccount->id,
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'verified_bank_account_required');
    }

    public function test_cashback_payout_uses_saved_verified_card(): void
    {
        $student = $this->makeLevel2Student();
        $this->seedApprovedCashback($student, 120_000);

        $account = VerifiedBankAccount::query()->create([
            'user_id' => $student->id,
            'verification_fee' => 7_000,
            'provider' => 'fake-financial',
            'verified_at' => now(),
            'is_default' => true,
        ]);
        $account->setCardNumber('6037991234567890');
        $account->save();

        Sanctum::actingAs($student);

        $this->postJson('/api/v1/student/cashback-payouts', [
            'verified_bank_account_id' => $account->id,
        ])
            ->assertCreated()
            ->assertJsonPath('data.masked_card_number', '6037 **** **** 7890');

        $this->assertDatabaseHas('cashback_payouts', [
            'user_id' => $student->id,
            'verified_bank_account_id' => $account->id,
            'amount' => 113_000,
        ]);
    }

    public function test_delete_requires_confirmation(): void
    {
        $student = $this->makeLevel2Student();
        $account = VerifiedBankAccount::query()->create([
            'user_id' => $student->id,
            'verification_fee' => 0,
            'verified_at' => now(),
        ]);
        $account->setCardNumber('6037991234567890');
        $account->save();

        Sanctum::actingAs($student);

        $this->deleteJson("/api/v1/student/verified-bank-accounts/{$account->id}")
            ->assertStatus(422);

        $this->deleteJson("/api/v1/student/verified-bank-accounts/{$account->id}", [
            'confirmed' => true,
        ])->assertOk();

        $this->assertDatabaseMissing('verified_bank_accounts', ['id' => $account->id]);
    }

    private function makeLevel2Student(string $mobile = '09121112233'): User
    {
        $student = User::factory()->create(['is_admin' => false, 'mobile' => $mobile]);
        $profile = app(EnsureIdentityProfile::class)($student);
        $profile->update([
            'first_name' => 'علی',
            'last_name' => 'تست',
            'national_code_encrypted' => NationalCode::encrypt('0010350829'),
            'national_code_hash' => hash_hmac('sha256', '0010350829#'.$student->id, (string) config('app.key')),
            'date_of_birth' => '1990-01-01',
            'identity_status' => IdentityVerificationStatus::Approved,
            'identity_verified_at' => now(),
            'verification_level' => 2,
        ]);

        return $student->fresh(['identityProfile']);
    }

    private function seedApprovedCashback(User $student, int $amount): void
    {
        $buyer = User::factory()->create(['mobile' => '09129998877']);
        $product = Product::query()->create([
            'title' => 'تست کش‌بک',
            'type' => 'normal',
            'price' => $amount,
            'is_active' => true,
        ]);
        $order = Order::query()->create([
            'user_id' => $buyer->id,
            'order_number' => 'BC-TEST-'.Str::upper(Str::random(6)),
            'product_id' => $product->id,
            'customer_name' => 'خریدار تست',
            'customer_phone' => $buyer->mobile,
            'amount' => $amount,
            'final_amount' => $amount,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        ReferralConversion::query()->create([
            'referrer_user_id' => $student->id,
            'buyer_user_id' => $buyer->id,
            'order_id' => $order->id,
            'cashback_amount' => $amount,
            'status' => ReferralConversionStatus::Approved,
            'converted_at' => now(),
        ]);
    }

    private function bindFakeFinancialProvider(OwnershipVerificationResult $result): void
    {
        $fake = new class($result) implements FinancialOwnershipVerificationProvider
        {
            public function __construct(private OwnershipVerificationResult $result) {}

            public function slug(): string
            {
                return 'fake-financial';
            }

            public function capabilities(): array
            {
                return [IdentityCapability::CardNationalCodeMatch, IdentityCapability::IbanNationalCodeMatch];
            }

            public function isConfigured(): bool
            {
                return true;
            }

            public function testConnection(): ProviderConnectionResult
            {
                return ProviderConnectionResult::connected('ok');
            }

            public function verifyCard(string $cardNumber, string $nationalCode, string $birthDate): MobileOwnershipVerificationResult
            {
                return new MobileOwnershipVerificationResult(
                    normalized_result: $this->result,
                    provider_code: 'TEST',
                    provider_message: 'test',
                    provider_request_id: 'req-1',
                    duration_ms: 10,
                );
            }

            public function verifyIban(string $iban, string $nationalCode, string $birthDate): MobileOwnershipVerificationResult
            {
                return $this->verifyCard('6037991234567890', $nationalCode, $birthDate);
            }

            public function inquireCard(string $cardNumber): ?array
            {
                return [
                    'iban' => 'IR123456789012345678901234',
                    'bank_name' => 'ملی',
                    'holder_name' => 'علی تست',
                ];
            }
        };

        $registry = \Mockery::mock(IdentityVerificationProviderRegistry::class);
        $registry->shouldReceive('resolveForCapability')
            ->andReturnUsing(function (IdentityCapability $capability, callable $verifyWith) use ($fake) {
                $route = IdentityVerificationRoute::query()
                    ->where('capability', $capability->value)
                    ->first();

                return [
                    'provider' => $fake,
                    'result' => $verifyWith($fake),
                    'used_fallback' => false,
                    'route' => $route,
                ];
            });

        $this->app->instance(IdentityVerificationProviderRegistry::class, $registry);

        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::CardNationalCodeMatch->value],
            ['primary_provider' => 'fake-financial', 'fallback_provider' => null, 'is_active' => true],
        );
        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::IbanNationalCodeMatch->value],
            ['primary_provider' => 'fake-financial', 'fallback_provider' => null, 'is_active' => true],
        );
    }
}
