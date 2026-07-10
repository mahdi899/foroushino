<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mini_course_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mini_course_id')->constrained('mini_courses')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('enrollment_number')->unique();
            $table->timestamp('enrolled_at');
            $table->timestamps();

            $table->unique(['mini_course_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mini_course_enrollments');
    }
};
