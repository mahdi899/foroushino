<?php

namespace App\Models;

use App\Enums\SaleStage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Script extends Model
{
    protected $fillable = ['product_id', 'title', 'stage', 'content'];

    protected function casts(): array
    {
        return [
            'stage' => SaleStage::class,
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
