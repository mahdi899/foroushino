<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_settings', function (Blueprint $table) {
            $table->boolean('admin_telegram_enabled')->default(true)->after('test_phone');
            $table->text('admin_telegram_chat_ids')->nullable()->after('admin_telegram_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('sms_settings', function (Blueprint $table) {
            $table->dropColumn(['admin_telegram_enabled', 'admin_telegram_chat_ids']);
        });
    }
};
