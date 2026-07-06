<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

class MediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isAdmin = (bool) $request->user()?->hasPermission('media.read');

        return [
            'id' => $this->id,
            'url' => $this->when(! $this->is_private, $this->referenceUrl()),
            'view_url' => $this->resolveViewUrl($request, $isAdmin),
            'type' => $this->type?->value,
            'mime' => $this->mime,
            'size' => $this->size,
            'width' => $this->width,
            'height' => $this->height,
            'alt_fa' => $this->alt_fa,
            'category' => $this->category,
            'original_filename' => $this->original_filename,
            'legacy_path' => $this->legacy_path,
            'is_private' => $this->is_private,
            'created_at' => $this->created_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'purge_at' => $this->deleted_at
                ? $this->deleted_at->copy()->addHours(\App\Models\Media::TRASH_RETENTION_HOURS)->toIso8601String()
                : null,
        ];
    }

    private function resolveViewUrl(Request $request, bool $isAdmin): ?string
    {
        if ($this->is_private) {
            if (! $isAdmin && ! $request->hasValidSignature()) {
                return null;
            }

            $ttl = (int) config('bahram.uploads.signed_url_ttl_minutes', 15);

            return URL::temporarySignedRoute('media.download', now()->addMinutes($ttl), ['medium' => $this->id]);
        }

        return $this->resolvedUrl();
    }
}
