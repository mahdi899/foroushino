<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('integration_tokens')) {
            Schema::create('integration_tokens', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('token_hash', 64)->unique();
                $table->json('abilities')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('revoked_at')->nullable();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('leads') && ! Schema::hasColumn('leads', 'bahram_application_id')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->unsignedBigInteger('bahram_application_id')->nullable()->unique()->after('import_batch_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'bahram_application_id')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropUnique(['bahram_application_id']);
                $table->dropColumn('bahram_application_id');
            });
        }

        Schema::dropIfExists('integration_tokens');
    }
};
