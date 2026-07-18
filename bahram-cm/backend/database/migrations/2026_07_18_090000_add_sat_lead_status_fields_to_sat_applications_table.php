<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sat_applications', function (Blueprint $table) {
            $table->string('sat_lead_status')->nullable()->after('sat_sync_error');
            $table->timestamp('sat_lead_status_synced_at')->nullable()->after('sat_lead_status');
        });
    }

    public function down(): void
    {
        Schema::table('sat_applications', function (Blueprint $table) {
            $table->dropColumn(['sat_lead_status', 'sat_lead_status_synced_at']);
        });
    }
};
