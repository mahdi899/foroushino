<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->string('tech_escalation', 32)->nullable()->after('department')->index();
            $table->timestamp('tech_resolved_at')->nullable()->after('tech_escalation');
            $table->foreignId('tech_resolved_by')->nullable()->after('tech_resolved_at')->constrained('users')->nullOnDelete();
        });

        DB::table('tickets')
            ->where('department', 'technical')
            ->whereNull('tech_escalation')
            ->update(['tech_escalation' => 'tech_support']);
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tech_resolved_by');
            $table->dropColumn(['tech_escalation', 'tech_resolved_at']);
        });
    }
};
