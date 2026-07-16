<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notification_outbox')) {
            return;
        }

        Schema::create('notification_outbox', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_type');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('payload');
            $table->json('requested_channels');
            $table->string('idempotency_key')->unique();
            $table->string('status')->default('pending');
            $table->timestamp('available_at')->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'available_at']);
            $table->index(['event_type']);
            $table->index(['user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_outbox');
    }
};
