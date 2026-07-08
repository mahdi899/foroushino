<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_providers', function (Blueprint $table) {
            $table->string('channel_type', 20)->default('sms')->after('label_fa');
            $table->string('docs_url')->nullable()->after('channel_type');
        });
    }

    public function down(): void
    {
        Schema::table('sms_providers', function (Blueprint $table) {
            $table->dropColumn(['channel_type', 'docs_url']);
        });
    }
};
