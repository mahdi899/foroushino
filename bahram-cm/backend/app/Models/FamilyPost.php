<?php

namespace App\Models;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostStatus;
use App\Enums\Family\FamilyPostType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FamilyPost extends Model
{
    protected $fillable = [
        'author_id',
        'type',
        'status',
        'audience_mode',
        'is_important',
        'comments_enabled',
        'is_pinned',
        'pinned_at',
        'reply_to_comment_id',
        'published_at',
        'archived_at',
        'scheduled_publish_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => FamilyPostType::class,
            'status' => FamilyPostStatus::class,
            'audience_mode' => FamilyPostAudienceMode::class,
            'is_important' => 'boolean',
            'comments_enabled' => 'boolean',
            'is_pinned' => 'boolean',
            'published_at' => 'datetime',
            'pinned_at' => 'datetime',
            'archived_at' => 'datetime',
            'scheduled_publish_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(FamilyPostBlock::class, 'post_id')->orderBy('position');
    }

    public function targets(): HasMany
    {
        return $this->hasMany(FamilyPostTarget::class, 'post_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(FamilyComment::class, 'post_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(FamilyReaction::class, 'post_id');
    }

    public function stats(): HasMany
    {
        return $this->hasMany(FamilyPostStat::class, 'post_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(FamilyAction::class, 'post_id');
    }

    public function replyToComment(): BelongsTo
    {
        return $this->belongsTo(FamilyComment::class, 'reply_to_comment_id');
    }
}
