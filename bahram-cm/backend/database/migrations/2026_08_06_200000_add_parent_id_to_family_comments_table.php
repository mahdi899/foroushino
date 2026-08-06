<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_comments', function (Blueprint $table) {
            $table->foreignId('parent_id')
                ->nullable()
                ->after('user_id')
                ->constrained('family_comments')
                ->nullOnDelete();

            $table->index(['post_id', 'family_id', 'parent_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('family_comments', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropIndex(['post_id', 'family_id', 'parent_id', 'status']);
            $table->dropColumn('parent_id');
        });
    }
};
