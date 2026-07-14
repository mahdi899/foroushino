<?php

namespace App\Models;

use App\Enums\Family\FamilyReactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyReaction extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'family_id',
        'type',
    ];

    protected function casts(): array
    {
        return [
            'type' => FamilyReactionType::class,
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(FamilyPost::class, 'post_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
}
