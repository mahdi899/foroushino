<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeminarAsset extends Model
{
    protected $fillable = [
        'seminar_id',
        'title',
        'type',
        'path',
        'is_downloadable',
    ];

    protected $casts = [
        'is_downloadable' => 'boolean',
    ];

    public function seminar(): BelongsTo
    {
        return $this->belongsTo(Seminar::class);
    }
}
