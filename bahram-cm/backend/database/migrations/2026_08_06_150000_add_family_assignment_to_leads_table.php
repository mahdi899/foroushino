<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('family_id')
                ->nullable()
                ->after('landing_page_id')
                ->constrained('families')
                ->nullOnDelete();

            $table->timestamp('assigned_at')->nullable()->after('status');

            $table->index(['landing_page_id', 'family_id']);
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropConstrainedForeignId('family_id');
            $table->dropColumn('assigned_at');
        });
    }
};
