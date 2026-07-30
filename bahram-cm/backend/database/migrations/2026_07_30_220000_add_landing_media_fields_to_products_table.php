<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'featured_image_mobile')) {
                $table->string('featured_image_mobile', 500)->nullable()->after('featured_image');
            }
            if (! Schema::hasColumn('products', 'landing_hero_image')) {
                $table->string('landing_hero_image', 500)->nullable()->after('featured_image_mobile');
            }
            if (! Schema::hasColumn('products', 'landing_hero_image_mobile')) {
                $table->string('landing_hero_image_mobile', 500)->nullable()->after('landing_hero_image');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            foreach (['featured_image_mobile', 'landing_hero_image', 'landing_hero_image_mobile'] as $column) {
                if (Schema::hasColumn('products', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
