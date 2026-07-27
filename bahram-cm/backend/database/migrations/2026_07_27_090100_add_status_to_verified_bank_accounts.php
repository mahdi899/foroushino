<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('verified_bank_accounts', function (Blueprint $table) {
            // pending | verified | rejected
            $table->string('status', 20)->default('pending')->after('provider');
            $table->foreignId('admin_reviewed_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestamp('admin_reviewed_at')->nullable()->after('admin_reviewed_by');
            $table->text('admin_note')->nullable()->after('admin_reviewed_at');
        });

        // Backfill: existing rows always had a verified_at timestamp set on create.
        DB::table('verified_bank_accounts')->whereNotNull('verified_at')->update(['status' => 'verified']);
    }

    public function down(): void
    {
        Schema::table('verified_bank_accounts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('admin_reviewed_by');
            $table->dropColumn(['status', 'admin_reviewed_at', 'admin_note']);
        });
    }
};
