<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->text('body')->nullable();
            $table->string('hero_image')->nullable();
            $table->string('submit_label')->nullable();
            $table->string('success_message')->nullable();
            $table->json('form_fields')->nullable(); // { "message": bool, "email": bool }
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['is_published']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_pages');
    }
};
