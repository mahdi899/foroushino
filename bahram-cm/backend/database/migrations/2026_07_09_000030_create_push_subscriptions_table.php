<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('endpoint');
            $table->string('public_key', 255);
            $table->string('auth_token', 255);
            $table->string('content_encoding', 32)->default('aesgcm');
            $table->string('user_agent', 512)->nullable();
            $table->timestamps();

            $table->unique('endpoint');
            $table->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
