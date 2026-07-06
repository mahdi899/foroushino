<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('type')->default('normal'); // package | normal
            $table->longText('description')->nullable();
            $table->text('short_description')->nullable();
            $table->unsignedBigInteger('price')->default(0);
            $table->unsignedBigInteger('sale_price')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('featured_image')->nullable();
            $table->string('spotplayer_course_id')->nullable();
            $table->string('spotplayer_product_id')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 500)->nullable();
            $table->timestamps();

            $table->index(['is_active', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
