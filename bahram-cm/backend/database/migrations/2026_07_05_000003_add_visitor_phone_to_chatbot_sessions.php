<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chatbot_sessions', function (Blueprint $table) {
            $table->string('visitor_phone', 30)->nullable()->after('page_url');
            $table->foreignId('lead_id')->nullable()->after('visitor_phone')->constrained('leads')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('chatbot_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lead_id');
            $table->dropColumn('visitor_phone');
        });
    }
};
