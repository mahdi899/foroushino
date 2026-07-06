<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('role')->default('دانشجو');
            $table->string('before_text');
            $table->string('after_text');
            $table->text('summary');
            $table->string('metric_label')->nullable();
            $table->string('metric_value')->nullable();
            $table->longText('body');
            $table->string('portrait_image')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_testimonials');
    }
};
