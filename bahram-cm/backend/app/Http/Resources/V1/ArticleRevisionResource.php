<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ArticleRevision */
class ArticleRevisionResource extends JsonResource
{
    public function __construct($resource, private bool $includeSnapshot = false)
    {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'revision_number' => $this->revision_number,
            'label' => $this->label,
            'created_at' => $this->created_at?->toIso8601String(),
            'author' => $this->author?->name,
            'is_manual' => $this->is_manual,
        ];

        if ($this->includeSnapshot) {
            $data['snapshot'] = $this->snapshot ?? [];
        }

        return $data;
    }
}
