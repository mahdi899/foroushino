<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('database_backup_settings')) {
            return;
        }

        // Legacy schema default was 7; runtime default is now 30 — bump untouched legacy rows only.
        DB::table('database_backup_settings')
            ->where(function ($query): void {
                $query->where('retention_count', 7)->orWhereNull('retention_count');
            })
            ->update(['retention_count' => 30]);

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement(
                'ALTER TABLE `database_backup_settings` MODIFY `retention_count` TINYINT UNSIGNED NOT NULL DEFAULT 30',
            );
        }
    }

    public function down(): void
    {
        // no-op — retention is operator preference
    }
};
