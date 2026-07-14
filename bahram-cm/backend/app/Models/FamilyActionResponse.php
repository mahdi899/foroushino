<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyActionResponse extends Model
{
    protected $fillable = [
        'action_id',
        'user_id',
        'family_id',
        'value',
        'follow_up_sent',
        'follow_up_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'array',
            'follow_up_sent' => 'boolean',
            'follow_up_sent_at' => 'datetime',
        ];
    }

    public function action(): BelongsTo
    {
        return $this->belongsTo(FamilyAction::class, 'action_id');
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
