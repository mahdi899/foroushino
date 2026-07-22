<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_testimonials', function (Blueprint $table) {
            $table->boolean('show_in_family_pulse')->default(false)->after('is_active');
            $table->string('family_pulse_quote', 500)->nullable()->after('show_in_family_pulse');

            $table->index(['is_active', 'show_in_family_pulse', 'sort_order'], 'student_testimonials_family_pulse_idx');
        });
    }

    public function down(): void
    {
        Schema::table('student_testimonials', function (Blueprint $table) {
            $table->dropIndex('student_testimonials_family_pulse_idx');
            $table->dropColumn(['show_in_family_pulse', 'family_pulse_quote']);
        });
    }
};
