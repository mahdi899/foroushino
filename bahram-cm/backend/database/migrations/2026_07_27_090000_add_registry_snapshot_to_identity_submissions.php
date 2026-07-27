<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('identity_verification_submissions', function (Blueprint $table) {
            $table->string('registry_first_name')->nullable()->after('provider_slug');
            $table->string('registry_last_name')->nullable()->after('registry_first_name');
            $table->string('registry_father_name')->nullable()->after('registry_last_name');
            $table->string('registry_gender', 20)->nullable()->after('registry_father_name');
            $table->boolean('registry_alive')->nullable()->after('registry_gender');
            // matched | mismatched | unavailable
            $table->string('registry_match_status', 20)->nullable()->after('registry_alive');
            $table->timestamp('registry_checked_at')->nullable()->after('registry_match_status');
        });
    }

    public function down(): void
    {
        Schema::table('identity_verification_submissions', function (Blueprint $table) {
            $table->dropColumn([
                'registry_first_name',
                'registry_last_name',
                'registry_father_name',
                'registry_gender',
                'registry_alive',
                'registry_match_status',
                'registry_checked_at',
            ]);
        });
    }
};
