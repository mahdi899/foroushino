<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\ImportBatch
 */
class ImportBatchResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source_filename' => $this->source_filename,
            'total_rows' => $this->total_rows,
            'imported_count' => $this->imported_count,
            'duplicate_count' => $this->duplicate_count,
            'error_count' => $this->error_count,
            'status' => $this->status->value,
            'errors' => $this->errors,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
