<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spotplayer_licenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('course_access_id')->nullable()->constrained('course_accesses')->nullOnDelete();
            $table->string('spotplayer_course_id')->nullable();
            $table->string('license_key')->nullable();
            $table->text('license_url')->nullable();
            $table->unsignedInteger('device_limit')->nullable();
            $table->string('status')->default('active');
            $table->json('raw_response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spotplayer_licenses');
    }
};
