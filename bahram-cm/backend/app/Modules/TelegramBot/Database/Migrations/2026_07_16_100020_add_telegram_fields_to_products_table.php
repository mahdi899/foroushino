<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'show_in_telegram')) {
                $table->boolean('show_in_telegram')->default(false)->after('is_active');
            }
            if (! Schema::hasColumn('products', 'telegram_list_visibility')) {
                $table->string('telegram_list_visibility', 16)->default('public')->after('show_in_telegram');
            }
            if (! Schema::hasColumn('products', 'telegram_sort_order')) {
                $table->integer('telegram_sort_order')->default(0)->after('telegram_list_visibility');
            }
            if (! Schema::hasColumn('products', 'telegram_content_id')) {
                $table->string('telegram_content_id')->nullable()->after('telegram_sort_order');
            }
            if (! Schema::hasColumn('products', 'telegram_settings')) {
                $table->json('telegram_settings')->nullable()->after('telegram_content_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            foreach (['telegram_settings', 'telegram_content_id', 'telegram_sort_order', 'telegram_list_visibility', 'show_in_telegram'] as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
