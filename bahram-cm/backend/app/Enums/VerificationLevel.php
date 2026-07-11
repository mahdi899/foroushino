<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum VerificationLevel: int
{
    use EnumValues;

    case Level1 = 1;
    case Level2 = 2;
    case Level3 = 3;

    /**
     * Level 1: base account.
     * Level 2: identity approved.
     * Level 3: identity approved + mobile ownership verified.
     */
    public static function derive(
        IdentityVerificationStatus|string $identityStatus,
        MobileOwnershipStatus|string $ownershipStatus,
    ): self {
        $identity = $identityStatus instanceof IdentityVerificationStatus
            ? $identityStatus
            : IdentityVerificationStatus::from($identityStatus);

        $ownership = $ownershipStatus instanceof MobileOwnershipStatus
            ? $ownershipStatus
            : MobileOwnershipStatus::from($ownershipStatus);

        if ($identity !== IdentityVerificationStatus::Approved) {
            return self::Level1;
        }

        if ($ownership === MobileOwnershipStatus::Verified) {
            return self::Level3;
        }

        return self::Level2;
    }

    public static function deriveInt(
        IdentityVerificationStatus|string $identityStatus,
        MobileOwnershipStatus|string $ownershipStatus,
    ): int {
        return self::derive($identityStatus, $ownershipStatus)->value;
    }
}
