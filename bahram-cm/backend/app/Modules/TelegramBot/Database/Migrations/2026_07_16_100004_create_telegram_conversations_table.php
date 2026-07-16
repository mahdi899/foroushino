<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_conversations')) {
            return;
        }

        Schema::create('telegram_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_account_id')->constrained('telegram_accounts')->cascadeOnDelete();
            $table->string('state')->default('idle');
            $table->unsignedInteger('version')->default(1);
            $table->json('context')->nullable();
            $table->timestamps();

            $table->unique('telegram_account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_conversations');
    }
};
