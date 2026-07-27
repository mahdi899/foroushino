<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_destination_leave_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('telegram_destination_id')->index();
            $table->unsignedBigInteger('telegram_user_id')->nullable();
            $table->string('previous_status')->nullable();
            $table->boolean('account_released')->default(false);
            $table->timestamp('detected_at');
            $table->timestamps();

            $table->index(['detected_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_destination_leave_events');
    }
};
