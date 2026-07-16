<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;

class TelegramSupportCategory extends Model
{
    protected $fillable = [
        'key',
        'title_fa',
        'default_topic_id',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'default_topic_id' => 'integer',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
