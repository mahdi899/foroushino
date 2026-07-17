<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('telegram_accounts')) {
            return;
        }

        Schema::table('telegram_accounts', function (Blueprint $table): void {
            if (! Schema::hasColumn('telegram_accounts', 'is_bot_admin')) {
                $table->boolean('is_bot_admin')->default(false)->after('is_blocked');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('telegram_accounts') || ! Schema::hasColumn('telegram_accounts', 'is_bot_admin')) {
            return;
        }

        Schema::table('telegram_accounts', function (Blueprint $table): void {
            $table->dropColumn('is_bot_admin');
        });
    }
};
