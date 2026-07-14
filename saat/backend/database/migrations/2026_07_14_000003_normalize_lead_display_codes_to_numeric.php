<?php

use App\Models\Lead;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Lead::query()->eachById(function (Lead $lead): void {
            $lead->forceFill(['display_code' => Lead::displayCodeForId((int) $lead->id)])->saveQuietly();
        });
    }

    public function down(): void
    {
        // irreversible — prior alphanumeric codes are not restored
    }
};
