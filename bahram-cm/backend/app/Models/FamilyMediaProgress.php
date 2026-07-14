<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyMediaProgress extends Model
{
    protected $table = 'family_media_progress';

    protected $fillable = [
        'user_id',
        'post_id',
        'media_id',
        'last_position',
        'max_position',
        'completion_percent',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'last_position' => 'integer',
            'max_position' => 'integer',
            'completion_percent' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(FamilyPost::class, 'post_id');
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(FamilyMedia::class, 'media_id');
    }
}
