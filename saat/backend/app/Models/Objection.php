<?php

namespace App\Models;

use App\Enums\ObjectionKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Objection extends Model
{
    protected $fillable = ['product_id', 'key', 'title', 'suggested_response', 'category'];

    protected function casts(): array
    {
        return [
            'key' => ObjectionKey::class,
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
