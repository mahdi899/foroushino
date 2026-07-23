<?php

namespace App\Models;

use App\Enums\Family\FamilyPostAudienceMode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FamilyStory extends Model
{
    protected $fillable = [
        'media_id',
        'caption',
        'audience_mode',
        'published_by',
        'published_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'audience_mode' => FamilyPostAudienceMode::class,
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(FamilyMedia::class, 'media_id');
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function targets(): HasMany
    {
        return $this->hasMany(FamilyStoryTarget::class, 'story_id');
    }

    public function views(): HasMany
    {
        return $this->hasMany(FamilyStoryView::class, 'story_id');
    }

    public function scopeActive($query)
    {
        return $query->where('expires_at', '>', now());
    }
}
