<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_work_sessions', function (Blueprint $table): void {
            if (! Schema::hasColumn('user_work_sessions', 'total_productive_seconds')) {
                $table->unsignedInteger('total_productive_seconds')->default(0)->after('total_break_seconds');
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_work_sessions', function (Blueprint $table): void {
            if (Schema::hasColumn('user_work_sessions', 'total_productive_seconds')) {
                $table->dropColumn('total_productive_seconds');
            }
        });
    }
};
