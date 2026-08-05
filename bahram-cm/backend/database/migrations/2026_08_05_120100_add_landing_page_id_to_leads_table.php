<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('landing_page_id')
                ->nullable()
                ->after('id')
                ->constrained('landing_pages')
                ->nullOnDelete();

            $table->index('landing_page_id');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropConstrainedForeignId('landing_page_id');
        });
    }
};
