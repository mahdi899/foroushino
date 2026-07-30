<?php

use App\Enums\IdentityCapability;
use App\Services\Identity\Providers\ApiIrShahkarProvider;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('identity_verification_routes')) {
            return;
        }

        $capability = IdentityCapability::PersonInfoInquiry->value;
        $exists = DB::table('identity_verification_routes')
            ->where('capability', $capability)
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('identity_verification_routes')->insert([
            'capability' => $capability,
            'primary_provider' => ApiIrShahkarProvider::SLUG,
            'fallback_provider' => null,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Keep the route — removing it would re-break PersonInfo on rollback.
    }
};
