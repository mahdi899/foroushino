<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class DatabaseBackupSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'is_auto_enabled',
        'schedule_time',
        'send_to_telegram',
        'retention_count',
        'last_backup_at',
        'last_backup_status',
        'last_backup_message',
        'last_backup_size_bytes',
    ];

    protected $casts = [
        'is_auto_enabled' => 'boolean',
        'send_to_telegram' => 'boolean',
        'retention_count' => 'integer',
        'last_backup_at' => 'datetime',
        'last_backup_size_bytes' => 'integer',
    ];
}
