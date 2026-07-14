<?php

namespace App\Models;

use App\Enums\Family\FamilyMediaType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyMediaUploadSession extends Model
{
    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    protected $fillable = [
        'ulid',
        'uploaded_by',
        'type',
        'original_filename',
        'mime_type',
        'total_size',
        'chunk_size',
        'total_chunks',
        'received_chunks',
        'temp_path',
        'status',
        'media_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => FamilyMediaType::class,
            'total_size' => 'integer',
            'chunk_size' => 'integer',
            'total_chunks' => 'integer',
            'received_chunks' => 'integer',
        ];
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(FamilyMedia::class, 'media_id');
    }
}
