<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->timestamp('scheduled_publish_at')->nullable()->after('published_at');
            $table->index(['status', 'scheduled_publish_at']);
        });
    }

    public function down(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->dropIndex(['status', 'scheduled_publish_at']);
            $table->dropColumn('scheduled_publish_at');
        });
    }
};
