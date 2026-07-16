<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_broadcasts')) {
            return;
        }

        Schema::create('telegram_broadcasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_bot_id')->constrained('telegram_bots')->cascadeOnDelete();
            $table->string('title');
            $table->string('status')->default('draft');
            $table->string('segment_key')->nullable();
            $table->json('content');
            $table->unsignedInteger('audience_count')->default(0);
            $table->boolean('requires_second_approval')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamp('stopped_at')->nullable();
            $table->timestamps();
        });

        Schema::create('telegram_broadcast_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_broadcast_id')->constrained('telegram_broadcasts')->cascadeOnDelete();
            $table->unsignedInteger('batch_index')->default(0);
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        Schema::create('telegram_broadcast_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_broadcast_id')->constrained('telegram_broadcasts')->cascadeOnDelete();
            $table->foreignId('telegram_account_id')->constrained('telegram_accounts')->cascadeOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('telegram_broadcast_batches')->nullOnDelete();
            $table->string('status')->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->unique(['telegram_broadcast_id', 'telegram_account_id'], 'tg_bcast_recipient_unique');
        });

        Schema::create('telegram_delivery_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_bot_id')->constrained('telegram_bots')->cascadeOnDelete();
            $table->foreignId('telegram_account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
            $table->string('channel')->default('telegram');
            $table->string('purpose')->nullable();
            $table->string('status');
            $table->json('payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_delivery_logs');
        Schema::dropIfExists('telegram_broadcast_recipients');
        Schema::dropIfExists('telegram_broadcast_batches');
        Schema::dropIfExists('telegram_broadcasts');
    }
};
