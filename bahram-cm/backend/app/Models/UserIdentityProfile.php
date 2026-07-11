<?php

namespace App\Models;

use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Enums\VerificationLevel;
use App\Support\NationalCode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class UserIdentityProfile extends Model
{
    protected $fillable = [
        'user_id',
        'uuid',
        'first_name',
        'last_name',
        'national_code_encrypted',
        'national_code_hash',
        'date_of_birth',
        'gender',
        'city',
        'identity_status',
        'verification_level',
        'identity_verified_at',
        'identity_verified_by',
        'mobile_ownership_status',
        'mobile_ownership_verified_at',
        'mobile_ownership_provider',
        'ownership_failed_attempts',
        'ownership_locked_at',
    ];

    protected $hidden = [
        'national_code_encrypted',
        'national_code_hash',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'identity_status' => IdentityVerificationStatus::class,
            'verification_level' => 'integer',
            'identity_verified_at' => 'datetime',
            'mobile_ownership_status' => MobileOwnershipStatus::class,
            'mobile_ownership_verified_at' => 'datetime',
            'ownership_failed_attempts' => 'integer',
            'ownership_locked_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $profile): void {
            $profile->uuid ??= (string) Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'identity_verified_by');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(IdentityVerificationSubmission::class, 'identity_profile_id');
    }

    public function deriveLevel(): int
    {
        return VerificationLevel::deriveInt(
            $this->identity_status ?? IdentityVerificationStatus::NotStarted,
            $this->mobile_ownership_status ?? MobileOwnershipStatus::NotStarted,
        );
    }

    public function syncVerificationLevel(): bool
    {
        $level = $this->deriveLevel();

        if ((int) $this->verification_level === $level) {
            return false;
        }

        $this->verification_level = $level;

        return $this->save();
    }

    public function maskNationalCode(): ?string
    {
        return NationalCode::mask(NationalCode::decrypt($this->national_code_encrypted));
    }
}
