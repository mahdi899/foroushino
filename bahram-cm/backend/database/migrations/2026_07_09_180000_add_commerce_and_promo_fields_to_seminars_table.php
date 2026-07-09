<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seminars', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('status')->constrained()->nullOnDelete();
            $table->unsignedInteger('price')->nullable()->after('product_id');
            $table->unsignedInteger('sale_price')->nullable()->after('price');
            $table->unsignedInteger('capacity')->nullable()->after('sale_price');
            $table->string('banner_available')->nullable()->after('capacity');
            $table->string('banner_full')->nullable()->after('banner_available');
            $table->boolean('promo_enabled')->default(false)->after('banner_full');
        });
    }

    public function down(): void
    {
        Schema::table('seminars', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
            $table->dropColumn([
                'price',
                'sale_price',
                'capacity',
                'banner_available',
                'banner_full',
                'promo_enabled',
            ]);
        });
    }
};
