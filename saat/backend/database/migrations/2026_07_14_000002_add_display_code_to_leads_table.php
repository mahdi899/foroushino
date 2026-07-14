<?php

use App\Models\Lead;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('display_code', 8)->nullable()->unique()->after('last_name');
        });

        Lead::query()
            ->whereNull('display_code')
            ->eachById(function (Lead $lead): void {
                $lead->forceFill(['display_code' => Lead::generateUniqueDisplayCode()])->save();
            });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('display_code');
        });
    }
};
