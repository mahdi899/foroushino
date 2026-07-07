<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReferralCode extends Model
{
    protected $fillable = [
        'user_id',
        'code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clicks(): HasMany
    {
        return $this->hasMany(ReferralClick::class);
    }

    /** Generates a unique, human-shareable referral code, e.g. BRM-48291. */
    public static function generateUniqueCode(): string
    {
        do {
            $code = 'BRM-'.random_int(10000, 99999);
        } while (static::query()->where('code', $code)->exists());

        return $code;
    }
}
