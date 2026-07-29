<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('identity_verification_submissions', function (Blueprint $table) {
            // matched | mismatched | unavailable
            $table->string('mobile_match_status', 20)->nullable()->after('registry_checked_at');
            $table->string('mobile_match_provider_code')->nullable()->after('mobile_match_status');
            $table->text('mobile_match_message')->nullable()->after('mobile_match_provider_code');
            $table->timestamp('mobile_match_checked_at')->nullable()->after('mobile_match_message');
        });
    }

    public function down(): void
    {
        Schema::table('identity_verification_submissions', function (Blueprint $table) {
            $table->dropColumn([
                'mobile_match_status',
                'mobile_match_provider_code',
                'mobile_match_message',
                'mobile_match_checked_at',
            ]);
        });
    }
};
