<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_providers', function (Blueprint $table) {
            $table->string('base_url')->nullable()->after('sender_number');
        });
    }

    public function down(): void
    {
        Schema::table('sms_providers', function (Blueprint $table) {
            $table->dropColumn('base_url');
        });
    }
};
