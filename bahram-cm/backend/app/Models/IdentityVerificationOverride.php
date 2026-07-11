<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdentityVerificationOverride extends Model
{
    protected $fillable = [
        'user_id',
        'actor_id',
        'previous_level',
        'new_level',
        'reason',
        'request_id',
    ];

    protected function casts(): array
    {
        return [
            'previous_level' => 'integer',
            'new_level' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
