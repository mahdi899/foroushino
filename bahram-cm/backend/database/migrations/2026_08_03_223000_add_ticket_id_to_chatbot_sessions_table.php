<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chatbot_sessions', function (Blueprint $table) {
            $table->foreignId('ticket_id')
                ->nullable()
                ->after('lead_id')
                ->constrained('tickets')
                ->nullOnDelete();
            $table->timestamp('converted_at')->nullable()->after('ticket_id');
        });
    }

    public function down(): void
    {
        Schema::table('chatbot_sessions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ticket_id');
            $table->dropColumn('converted_at');
        });
    }
};
