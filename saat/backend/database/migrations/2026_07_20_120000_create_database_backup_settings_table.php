<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('database_backup_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_auto_enabled')->default(false);
            $table->string('schedule_time', 5)->default('04:00');
            $table->unsignedTinyInteger('retention_count')->default(30);
            $table->timestamp('last_backup_at')->nullable();
            $table->string('last_backup_status', 20)->nullable();
            $table->text('last_backup_message')->nullable();
            $table->unsignedBigInteger('last_backup_size_bytes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('database_backup_settings');
    }
};
