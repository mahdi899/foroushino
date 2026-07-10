<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discount_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('discount_type', 20);
            $table->unsignedInteger('discount_value');
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('max_uses_per_user')->nullable();
            $table->unsignedBigInteger('min_order_amount')->nullable();
            $table->unsignedBigInteger('max_discount_amount')->nullable();
            $table->boolean('requires_link')->default(false);
            $table->string('restriction', 30)->default('all');
            $table->unsignedInteger('uses_count')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'starts_at', 'ends_at']);
        });

        Schema::create('discount_code_product', function (Blueprint $table) {
            $table->foreignId('discount_code_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['discount_code_id', 'product_id']);
        });

        Schema::create('discount_code_user', function (Blueprint $table) {
            $table->foreignId('discount_code_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['discount_code_id', 'user_id']);
        });

        Schema::create('discount_code_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('discount_code_id')->constrained();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('discount_amount');
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('discount_code_id')->nullable()->after('referral_code')->constrained()->nullOnDelete();
            $table->string('coupon_code', 50)->nullable()->after('discount_code_id');
            $table->unsignedBigInteger('coupon_discount_amount')->default(0)->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('discount_code_id');
            $table->dropColumn(['coupon_code', 'coupon_discount_amount']);
        });

        Schema::dropIfExists('discount_code_usages');
        Schema::dropIfExists('discount_code_user');
        Schema::dropIfExists('discount_code_product');
        Schema::dropIfExists('discount_codes');
    }
};
