<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
            $table->unsignedInteger('revision_number');
            $table->string('label');
            $table->json('snapshot');
            $table->string('content_hash', 64);
            $table->boolean('is_manual')->default(false);
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['article_id', 'revision_number']);
            $table->index(['article_id', 'created_at']);
            $table->index(['article_id', 'is_manual']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_revisions');
    }
};
