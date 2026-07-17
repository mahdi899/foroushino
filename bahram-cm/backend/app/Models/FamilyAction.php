<?php

namespace App\Models;

use App\Enums\Family\FamilyActionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FamilyAction extends Model
{
    protected $fillable = [
        'post_id',
        'type',
        'prompt',
        'config',
        'follow_up_after_minutes',
        'follow_up_message',
        'active_until',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => FamilyActionType::class,
            'config' => 'array',
            'follow_up_after_minutes' => 'integer',
            'active_until' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(FamilyPost::class, 'post_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(FamilyActionOption::class, 'action_id')->orderBy('position');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(FamilyActionResponse::class, 'action_id');
    }
}
