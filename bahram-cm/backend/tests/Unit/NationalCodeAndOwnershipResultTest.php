<?php

namespace Tests\Unit;

use App\Enums\OwnershipVerificationResult;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Support\NationalCode;
use Tests\TestCase;

class NationalCodeAndOwnershipResultTest extends TestCase
{
    public function test_national_code_mask_and_roundtrip(): void
    {
        $code = '0010350829';
        $this->assertTrue(NationalCode::isValid($code));
        $this->assertSame('001******9', NationalCode::mask($code));

        $encrypted = NationalCode::encrypt($code);
        $this->assertSame($code, NationalCode::decrypt($encrypted));
        $this->assertSame(64, strlen(NationalCode::hash($code)));
    }

    public function test_ownership_result_classifies_business_vs_technical(): void
    {
        $matched = new MobileOwnershipVerificationResult(OwnershipVerificationResult::Matched);
        $this->assertTrue($matched->isBusinessResult());
        $this->assertFalse($matched->isTechnicalFailure());

        $mismatch = new MobileOwnershipVerificationResult(OwnershipVerificationResult::Mismatched);
        $this->assertTrue($mismatch->isBusinessResult());
        $this->assertFalse($mismatch->isTechnicalFailure());

        $tech = new MobileOwnershipVerificationResult(OwnershipVerificationResult::TechnicalError);
        $this->assertFalse($tech->isBusinessResult());
        $this->assertTrue($tech->isTechnicalFailure());
    }
}
