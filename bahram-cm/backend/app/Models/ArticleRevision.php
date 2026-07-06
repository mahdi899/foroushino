<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArticleRevision extends Model
{
    public const MAX_AUTOSAVES = 10;

    protected $fillable = [
        'article_id',
        'revision_number',
        'label',
        'snapshot',
        'content_hash',
        'is_manual',
        'author_id',
    ];

    protected $casts = [
        'snapshot' => 'array',
        'is_manual' => 'boolean',
        'revision_number' => 'integer',
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
