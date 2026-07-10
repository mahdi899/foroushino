<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mini_course_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mini_course_id')->constrained()->cascadeOnDelete();
            $table->string('author_name');
            $table->string('author_email')->nullable();
            $table->text('body');
            $table->string('status', 20)->default('pending');
            $table->foreignId('parent_id')->nullable()->constrained('mini_course_comments')->nullOnDelete();
            $table->timestamps();

            $table->index(['mini_course_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mini_course_comments');
    }
};
