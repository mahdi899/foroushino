<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sat_applications', function (Blueprint $table) {
            $table->timestamp('synced_to_sat_at')->nullable()->after('reviewed_at');
            $table->text('sat_sync_error')->nullable()->after('synced_to_sat_at');
        });
    }

    public function down(): void
    {
        Schema::table('sat_applications', function (Blueprint $table) {
            $table->dropColumn(['synced_to_sat_at', 'sat_sync_error']);
        });
    }
};
