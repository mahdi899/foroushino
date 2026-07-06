<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('source')->default('website'); // website | chatbot | newsletter | apply ...
            $table->text('message')->nullable();
            $table->string('page_url')->nullable();
            $table->string('status')->default('new'); // new | contacted | converted | ignored
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['status', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
