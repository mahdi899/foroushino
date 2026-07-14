<?php

namespace App\Models;

use App\Enums\Family\FamilyPostBlockType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyPostBlock extends Model
{
    protected $fillable = [
        'post_id',
        'type',
        'position',
        'text_content',
        'media_id',
        'article_id',
        'comment_id',
        'action_id',
        'data',
    ];

    protected function casts(): array
    {
        return [
            'type' => FamilyPostBlockType::class,
            'position' => 'integer',
            'data' => 'array',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(FamilyPost::class, 'post_id');
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(FamilyMedia::class, 'media_id');
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class, 'article_id');
    }

    public function comment(): BelongsTo
    {
        return $this->belongsTo(FamilyComment::class, 'comment_id');
    }

    public function action(): BelongsTo
    {
        return $this->belongsTo(FamilyAction::class, 'action_id');
    }
}
