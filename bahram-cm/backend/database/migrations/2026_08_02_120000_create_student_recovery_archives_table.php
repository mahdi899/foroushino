<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_recovery_archives', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('original_user_id');
            $table->foreignId('deleted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('display_name')->nullable();
            $table->string('mobile', 20)->nullable();
            $table->json('snapshot');
            $table->timestamp('purge_at');
            $table->timestamp('purged_at')->nullable();
            $table->timestamps();

            $table->index('purge_at');
            $table->index('original_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_recovery_archives');
    }
};
