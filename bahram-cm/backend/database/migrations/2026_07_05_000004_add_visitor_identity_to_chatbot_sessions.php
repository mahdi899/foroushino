<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chatbot_sessions', function (Blueprint $table) {
            $table->string('visitor_first_name', 80)->nullable()->after('visitor_phone');
            $table->string('visitor_last_name', 80)->nullable()->after('visitor_first_name');
            $table->uuid('preferred_operator_profile_id')->nullable()->after('visitor_last_name');
        });
    }

    public function down(): void
    {
        Schema::table('chatbot_sessions', function (Blueprint $table) {
            $table->dropColumn(['visitor_first_name', 'visitor_last_name', 'preferred_operator_profile_id']);
        });
    }
};
