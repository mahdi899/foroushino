<?php

namespace App\Models;

use App\Enums\MediaType;
use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Media extends Model
{
    use SoftDeletes;

    public const TRASH_RETENTION_HOURS = 24;
    protected $table = 'media';

    protected $fillable = [
        'disk', 'path', 'url', 'type', 'mime', 'size',
        'width', 'height', 'alt_fa', 'original_filename', 'category', 'legacy_path',
        'is_private', 'keep_on_server', 'uploaded_by',
    ];

    protected $casts = [
        'is_private' => 'boolean',
        'keep_on_server' => 'boolean',
        'type' => MediaType::class,
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function resolvedUrl(): ?string
    {
        if ($this->is_private) {
            return null;
        }

        if ($this->url) {
            return MediaUrl::resolve($this->url);
        }

        return MediaUrl::resolve(MediaUrl::fromDiskPath($this->path));
    }

    /** Portable path for DB / API JSON. */
    public function referenceUrl(): ?string
    {
        if ($this->is_private) {
            return null;
        }

        if ($this->url) {
            return MediaUrl::reference($this->url);
        }

        return MediaUrl::fromDiskPath($this->path);
    }

    public function isSiteAsset(): bool
    {
        return self::isSiteAssetPath((string) $this->path);
    }

    public static function isSiteAssetPath(string $path): bool
    {
        $path = str_replace('\\', '/', trim($path, '/'));

        return str_starts_with($path, 'media/site/');
    }
}
