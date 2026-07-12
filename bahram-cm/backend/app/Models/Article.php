<?php

namespace App\Models;

use App\Models\ArticleRevision;
use App\Services\ArticleSeoAnalyzerService;
use App\Support\ArticleSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;
use Stevebauman\Purify\Facades\Purify;

class Article extends Model
{
    use HasSlug;
    use SoftDeletes;

    public const TRASH_RETENTION_HOURS = 24;

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'featured_image',
        'featured_image_mobile',
        'reading_time',
        'kicker',
        'meta_title',
        'meta_description',
        'focus_keyword',
        'canonical_url',
        'status',
        'published_at',
        'seo_score',
        'seo_status',
        'seo_checks',
        'is_indexable',
        'author_id',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'seo_score' => 'integer',
        'seo_checks' => 'array',
        'is_indexable' => 'boolean',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom(fn (self $article): string => ArticleSlug::normalize($article->slug, $article->title))
            ->saveSlugsTo('slug')
            ->doNotGenerateSlugsOnUpdate();
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(ArticleRevision::class)->orderByDesc('revision_number');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    protected static function booted(): void
    {
        // Sanitize HTML content before it ever reaches the database to prevent XSS.
        static::saving(function (Article $article) {
            if ($article->isDirty('content') && filled($article->content)) {
                $article->content = Purify::clean($article->content);
            }
        });

        // Recompute the SEO score/status/checks every time the article changes.
        // saveQuietly() below suppresses events, so this cannot loop.
        static::saved(function (Article $article) {
            app(ArticleSeoAnalyzerService::class)->analyzeAndPersist($article);
        });
    }
}
