<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (! Schema::hasColumn('products', 'telegram_photo_file_id')) {
                    $table->string('telegram_photo_file_id', 255)->nullable()->after('telegram_settings');
                }
                if (! Schema::hasColumn('products', 'telegram_photo_source')) {
                    $table->string('telegram_photo_source', 512)->nullable()->after('telegram_photo_file_id');
                }
            });
        }

        if (Schema::hasTable('seminars')) {
            Schema::table('seminars', function (Blueprint $table) {
                if (! Schema::hasColumn('seminars', 'telegram_photo_file_id')) {
                    $table->string('telegram_photo_file_id', 255)->nullable()->after('cover_image_mobile');
                }
                if (! Schema::hasColumn('seminars', 'telegram_photo_source')) {
                    $table->string('telegram_photo_source', 512)->nullable()->after('telegram_photo_file_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                foreach (['telegram_photo_source', 'telegram_photo_file_id'] as $col) {
                    if (Schema::hasColumn('products', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('seminars')) {
            Schema::table('seminars', function (Blueprint $table) {
                foreach (['telegram_photo_source', 'telegram_photo_file_id'] as $col) {
                    if (Schema::hasColumn('seminars', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
