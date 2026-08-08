<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->boolean('notify_members')->default(false)->after('is_important');
        });

        // Preserve prior behavior: important posts used to always fan out notifications.
        DB::table('family_posts')->where('is_important', true)->update(['notify_members' => true]);
    }

    public function down(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->dropColumn('notify_members');
        });
    }
};
