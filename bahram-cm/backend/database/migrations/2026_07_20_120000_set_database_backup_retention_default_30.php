<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('database_backup_settings')) {
            return;
        }

        DB::table('database_backup_settings')->where('retention_count', 7)->update(['retention_count' => 30]);
    }

    public function down(): void
    {
        // no-op — retention is operator preference
    }
};
