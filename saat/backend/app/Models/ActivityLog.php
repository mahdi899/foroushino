<?php

namespace App\Models;

use App\Enums\ActivityKind;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'kind', 'title', 'meta'];

    protected function casts(): array
    {
        return [
            'kind' => ActivityKind::class,
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
