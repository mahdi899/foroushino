<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reference_channels', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('status')->default('draft'); // draft|published
            $table->unsignedInteger('price')->default(0);
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('telegram_destination_id')->nullable()->index();
            $table->string('cover_image')->nullable();
            $table->timestamps();
        });

        Schema::create('reference_channel_entitlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reference_channel_id')->constrained('reference_channels')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source')->default('purchase'); // purchase|admin
            $table->timestamps();

            $table->unique(['reference_channel_id', 'user_id'], 'ref_channel_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reference_channel_entitlements');
        Schema::dropIfExists('reference_channels');
    }
};
