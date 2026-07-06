<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20);
            $table->string('title');
            $table->text('body');
            $table->string('href')->nullable();
            $table->boolean('read')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'read']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};
