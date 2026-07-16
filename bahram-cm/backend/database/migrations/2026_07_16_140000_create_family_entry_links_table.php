<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_entry_links', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('source');
            $table->foreignId('entry_event_id')->constrained('family_entry_events')->cascadeOnDelete();
            $table->string('campaign')->nullable();
            $table->string('topic')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['source', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_entry_links');
    }
};
