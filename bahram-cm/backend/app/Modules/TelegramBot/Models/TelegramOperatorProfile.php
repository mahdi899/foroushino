<?php

namespace App\Modules\TelegramBot\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramOperatorProfile extends Model
{
    protected $fillable = [
        'telegram_user_id',
        'admin_user_id',
        'display_name',
        'support_role',
        'is_active',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'telegram_user_id' => 'integer',
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }
}
