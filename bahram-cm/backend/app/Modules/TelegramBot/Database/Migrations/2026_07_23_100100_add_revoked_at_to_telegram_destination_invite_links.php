<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('telegram_destination_invite_links')) {
            return;
        }

        Schema::table('telegram_destination_invite_links', function (Blueprint $table) {
            if (! Schema::hasColumn('telegram_destination_invite_links', 'revoked_at')) {
                $table->timestamp('revoked_at')->nullable()->after('expires_at');
            }
            if (! Schema::hasColumn('telegram_destination_invite_links', 'used_at')) {
                $table->timestamp('used_at')->nullable()->after('revoked_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('telegram_destination_invite_links')) {
            return;
        }

        Schema::table('telegram_destination_invite_links', function (Blueprint $table) {
            if (Schema::hasColumn('telegram_destination_invite_links', 'used_at')) {
                $table->dropColumn('used_at');
            }
            if (Schema::hasColumn('telegram_destination_invite_links', 'revoked_at')) {
                $table->dropColumn('revoked_at');
            }
        });
    }
};
