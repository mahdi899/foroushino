<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramDestinationRequirement extends Model
{
    protected $fillable = [
        'telegram_destination_id',
        'requirement_type',
        'requirement_value',
        'group_key',
        'operator',
    ];

    public function destination(): BelongsTo
    {
        return $this->belongsTo(TelegramDestination::class, 'telegram_destination_id');
    }
}
