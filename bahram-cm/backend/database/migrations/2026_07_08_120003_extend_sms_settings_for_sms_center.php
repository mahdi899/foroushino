<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_settings', function (Blueprint $table) {
            $table->string('primary_provider_slug')->default('melipayamak')->after('sms_provider');
            $table->string('fallback_provider_slug')->nullable()->after('primary_provider_slug');
            $table->unsignedSmallInteger('fallback_delay_seconds')->default(20)->after('fallback_provider_slug');
            $table->boolean('fallback_enabled')->default(true)->after('fallback_delay_seconds');
        });
    }

    public function down(): void
    {
        Schema::table('sms_settings', function (Blueprint $table) {
            $table->dropColumn([
                'primary_provider_slug',
                'fallback_provider_slug',
                'fallback_delay_seconds',
                'fallback_enabled',
            ]);
        });
    }
};
