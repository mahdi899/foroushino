<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentComment extends Model
{
    public const TYPE_COURSE = 'course';

    public const TYPE_MINI_COURSE = 'mini_course';

    public const TYPE_ARTICLE = 'article';

    public const TYPE_SEMINAR = 'seminar';

    public const TYPE_CAMPAIGN_WRITING = 'campaign_writing';

    /** @var list<string> */
    public const TYPES = [
        self::TYPE_COURSE,
        self::TYPE_MINI_COURSE,
        self::TYPE_ARTICLE,
        self::TYPE_SEMINAR,
        self::TYPE_CAMPAIGN_WRITING,
    ];

    protected $fillable = [
        'content_type',
        'content_slug',
        'user_id',
        'author_name',
        'author_email',
        'author_avatar_url',
        'body',
        'status',
        'parent_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('id');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved');
    }

    public function scopeTopLevel(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function scopeForContent(Builder $query, string $type, string $slug): Builder
    {
        return $query
            ->where('content_type', $type)
            ->where('content_slug', $slug);
    }
}
