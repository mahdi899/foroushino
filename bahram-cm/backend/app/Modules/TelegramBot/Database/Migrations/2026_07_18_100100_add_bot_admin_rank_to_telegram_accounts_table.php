<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('telegram_accounts')) {
            return;
        }

        Schema::table('telegram_accounts', function (Blueprint $table): void {
            if (! Schema::hasColumn('telegram_accounts', 'bot_admin_rank')) {
                $table->string('bot_admin_rank', 20)->nullable()->after('is_bot_admin');
            }
        });

        // Existing bot admins become simple; permanent admins sync to super at runtime.
        DB::table('telegram_accounts')
            ->where('is_bot_admin', true)
            ->whereNull('bot_admin_rank')
            ->update(['bot_admin_rank' => 'simple']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('telegram_accounts') || ! Schema::hasColumn('telegram_accounts', 'bot_admin_rank')) {
            return;
        }

        Schema::table('telegram_accounts', function (Blueprint $table): void {
            $table->dropColumn('bot_admin_rank');
        });
    }
};
