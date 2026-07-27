<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_destination_memberships')) {
            return;
        }

        Schema::create('telegram_destination_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('telegram_destination_id')->constrained('telegram_destinations')->cascadeOnDelete();
            $table->boolean('is_member')->default(false);
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'telegram_destination_id'], 'tdm_user_destination_unique');
            $table->index(['telegram_destination_id', 'is_member'], 'tdm_destination_member_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_destination_memberships');
    }
};
