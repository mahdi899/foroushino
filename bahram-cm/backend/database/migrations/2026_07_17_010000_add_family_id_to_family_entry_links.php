<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_entry_links', function (Blueprint $table) {
            $table->foreignId('family_id')
                ->nullable()
                ->after('entry_event_id')
                ->constrained('families')
                ->nullOnDelete();

            $table->index(['family_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('family_entry_links', function (Blueprint $table) {
            $table->dropConstrainedForeignId('family_id');
        });
    }
};
