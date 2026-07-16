<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_accounts')) {
            return;
        }

        Schema::create('telegram_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_bot_id')->constrained('telegram_bots')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('telegram_user_id');
            $table->string('telegram_username')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('display_name')->nullable();
            $table->string('mobile', 11)->nullable();
            $table->timestamp('mobile_verified_at')->nullable();
            $table->string('language_code', 10)->nullable();
            $table->boolean('is_blocked')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique('user_id');
            $table->unique(['telegram_bot_id', 'telegram_user_id']);
            $table->index(['telegram_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_accounts');
    }
};
