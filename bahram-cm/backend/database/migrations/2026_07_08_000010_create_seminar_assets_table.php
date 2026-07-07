<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `path` is a storage-relative path only; it must always be resolved
     * through a signed/controlled route, never exposed as a public URL.
     */
    public function up(): void
    {
        Schema::create('seminar_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seminar_id')->constrained('seminars')->cascadeOnDelete();
            $table->string('title');
            $table->string('type')->default('file');
            $table->string('path');
            $table->boolean('is_downloadable')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seminar_assets');
    }
};
