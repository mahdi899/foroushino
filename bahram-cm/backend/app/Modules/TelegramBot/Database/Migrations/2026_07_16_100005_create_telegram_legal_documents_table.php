<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_legal_documents')) {
            return;
        }

        Schema::create('telegram_legal_documents', function (Blueprint $table) {
            $table->id();
            $table->string('key');
            $table->string('version');
            $table->string('title');
            $table->text('content')->nullable();
            $table->string('url')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamp('effective_at')->nullable();
            $table->timestamps();

            $table->unique(['key', 'version']);
            $table->index(['key', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_legal_documents');
    }
};
