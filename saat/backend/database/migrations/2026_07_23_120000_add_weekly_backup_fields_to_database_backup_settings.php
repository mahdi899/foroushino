<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('database_backup_settings', function (Blueprint $table): void {
            $table->boolean('is_weekly_auto_enabled')->default(true)->after('is_auto_enabled');
            $table->unsignedTinyInteger('weekly_schedule_weekday')->default(0)->after('schedule_time');
            $table->timestamp('last_weekly_backup_at')->nullable()->after('last_backup_size_bytes');
            $table->string('last_weekly_backup_status', 20)->nullable()->after('last_weekly_backup_at');
            $table->text('last_weekly_backup_message')->nullable()->after('last_weekly_backup_status');
            $table->unsignedBigInteger('last_weekly_backup_size_bytes')->nullable()->after('last_weekly_backup_message');
        });
    }

    public function down(): void
    {
        Schema::table('database_backup_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'is_weekly_auto_enabled',
                'weekly_schedule_weekday',
                'last_weekly_backup_at',
                'last_weekly_backup_status',
                'last_weekly_backup_message',
                'last_weekly_backup_size_bytes',
            ]);
        });
    }
};
