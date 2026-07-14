<?php

namespace App\Models;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Support\FamilyMediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyMedia extends Model
{
    protected $table = 'family_media';

    protected $fillable = [
        'type',
        'disk',
        'storage_path',
        'temp_path',
        'original_filename',
        'mime_type',
        'size',
        'duration',
        'width',
        'height',
        'waveform',
        'status',
        'failure_reason',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => FamilyMediaType::class,
            'status' => FamilyMediaStatus::class,
            'waveform' => 'array',
            'size' => 'integer',
            'duration' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
        ];
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function cdnUrl(): ?string
    {
        if ($this->status !== FamilyMediaStatus::Ready) {
            return null;
        }

        return FamilyMediaUrl::fromPath($this->storage_path);
    }
}
