<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->index();
            $table->string('name')->nullable();
            $table->string('phone')->nullable();
            $table->string('status')->default('open'); // open | closed
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_conversations');
    }
};
