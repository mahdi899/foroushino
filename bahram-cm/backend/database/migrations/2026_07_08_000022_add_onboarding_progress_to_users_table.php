<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stores click-tracked onboarding checklist steps that cannot be derived
     * from other tables (e.g. "joined Telegram channel"). Derivable steps
     * (profile completeness, SAT submission) are computed on the fly instead.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('onboarding_progress')->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('onboarding_progress');
        });
    }
};
