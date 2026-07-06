<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('content')->nullable();
            $table->string('featured_image')->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 500)->nullable();
            $table->string('focus_keyword')->nullable();
            $table->string('canonical_url')->nullable();
            $table->string('status')->default('draft'); // draft | published
            $table->timestamp('published_at')->nullable();
            $table->unsignedTinyInteger('seo_score')->default(0); // 0..100
            $table->string('seo_status')->default('poor'); // poor | ok | good
            $table->json('seo_checks')->nullable();
            $table->boolean('is_indexable')->default(true);
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
