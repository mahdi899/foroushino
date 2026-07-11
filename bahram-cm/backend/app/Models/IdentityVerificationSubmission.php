<?php

namespace App\Models;

use App\Enums\IdentityVerificationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class IdentityVerificationSubmission extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'identity_profile_id',
        'version',
        'status',
        'first_name',
        'last_name',
        'national_code_encrypted',
        'national_code_hash',
        'date_of_birth',
        'gender',
        'city',
        'expected_video_text',
        'required_corrections',
        'provider_route',
        'provider_slug',
        'submitted_at',
        'reviewed_at',
    ];

    protected $hidden = [
        'national_code_encrypted',
        'national_code_hash',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'status' => IdentityVerificationStatus::class,
            'date_of_birth' => 'date',
            'required_corrections' => 'array',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $submission): void {
            $submission->uuid ??= (string) Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function identityProfile(): BelongsTo
    {
        return $this->belongsTo(UserIdentityProfile::class, 'identity_profile_id');
    }

    public function artifacts(): HasMany
    {
        return $this->hasMany(IdentityVerificationArtifact::class, 'submission_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(IdentityVerificationReview::class, 'submission_id');
    }
}
