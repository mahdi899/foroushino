<?php

namespace App\Models;

use App\Enums\IdentityArtifactType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class IdentityVerificationArtifact extends Model
{
    protected $fillable = [
        'uuid',
        'submission_id',
        'type',
        'disk',
        'path',
        'mime_type',
        'size_bytes',
        'original_name',
    ];

    protected function casts(): array
    {
        return [
            'type' => IdentityArtifactType::class,
            'size_bytes' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $artifact): void {
            $artifact->uuid ??= (string) Str::uuid();
        });
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(IdentityVerificationSubmission::class, 'submission_id');
    }
}
