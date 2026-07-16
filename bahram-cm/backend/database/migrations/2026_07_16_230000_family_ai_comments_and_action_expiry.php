<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->boolean('comments_enabled')->default(true)->after('is_important');
        });

        Schema::table('family_actions', function (Blueprint $table) {
            $table->timestamp('active_until')->nullable()->after('follow_up_message');
            $table->boolean('is_active')->default(true)->after('active_until');
        });
    }

    public function down(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->dropColumn('comments_enabled');
        });

        Schema::table('family_actions', function (Blueprint $table) {
            $table->dropColumn(['active_until', 'is_active']);
        });
    }
};
