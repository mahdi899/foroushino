<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class DatabaseBackupSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'is_auto_enabled',
        'is_weekly_auto_enabled',
        'schedule_time',
        'weekly_schedule_weekday',
        'retention_count',
        'last_backup_at',
        'last_backup_status',
        'last_backup_message',
        'last_backup_size_bytes',
        'last_weekly_backup_at',
        'last_weekly_backup_status',
        'last_weekly_backup_message',
        'last_weekly_backup_size_bytes',
    ];

    protected $casts = [
        'is_auto_enabled' => 'boolean',
        'is_weekly_auto_enabled' => 'boolean',
        'weekly_schedule_weekday' => 'integer',
        'retention_count' => 'integer',
        'last_backup_at' => 'datetime',
        'last_backup_size_bytes' => 'integer',
        'last_weekly_backup_at' => 'datetime',
        'last_weekly_backup_size_bytes' => 'integer',
    ];

    public static function current(): static
    {
        return static::query()->firstOrCreate([], [
            'is_auto_enabled' => true,
            'is_weekly_auto_enabled' => true,
            'schedule_time' => '04:00',
            'weekly_schedule_weekday' => 0,
            'retention_count' => 30,
        ]);
    }
}
