<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_logs', function (Blueprint $table) {
            $table->string('event_key')->nullable()->after('user_id');
            $table->foreignId('fallback_of_log_id')->nullable()->after('event_key')->constrained('sms_logs')->nullOnDelete();
            $table->boolean('is_fallback_attempt')->default(false)->after('fallback_of_log_id');
        });
    }

    public function down(): void
    {
        Schema::table('sms_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fallback_of_log_id');
            $table->dropColumn(['event_key', 'is_fallback_attempt']);
        });
    }
};
