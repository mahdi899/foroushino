<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sat_integration_tokens')) {
            Schema::create('sat_integration_tokens', function (Blueprint $table) {
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

        if (Schema::hasTable('sat_leads')) {
            Schema::table('sat_leads', function (Blueprint $table) {
                if (! Schema::hasColumn('sat_leads', 'bahram_application_id')) {
                    $table->unsignedBigInteger('bahram_application_id')->nullable()->unique()->after('marketing_lead_id');
                }
                if (! Schema::hasColumn('sat_leads', 'source')) {
                    $table->string('source')->default('manual')->after('bahram_application_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('sat_leads')) {
            Schema::table('sat_leads', function (Blueprint $table) {
                if (Schema::hasColumn('sat_leads', 'bahram_application_id')) {
                    $table->dropUnique(['bahram_application_id']);
                    $table->dropColumn('bahram_application_id');
                }
                if (Schema::hasColumn('sat_leads', 'source')) {
                    $table->dropColumn('source');
                }
            });
        }

        Schema::dropIfExists('sat_integration_tokens');
    }
};
