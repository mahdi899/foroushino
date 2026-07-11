<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_identity_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->text('national_code_encrypted')->nullable();
            $table->string('national_code_hash', 64)->nullable()->unique();
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 20)->nullable();
            $table->string('city')->nullable();
            $table->string('identity_status', 40)->default('not_started')->index();
            $table->unsignedTinyInteger('verification_level')->default(1)->index();
            $table->timestamp('identity_verified_at')->nullable();
            $table->foreignId('identity_verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('mobile_ownership_status', 40)->default('not_started')->index();
            $table->timestamp('mobile_ownership_verified_at')->nullable();
            $table->string('mobile_ownership_provider')->nullable();
            $table->unsignedSmallInteger('ownership_failed_attempts')->default(0);
            $table->timestamp('ownership_locked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('identity_verification_submissions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('identity_profile_id')->constrained('user_identity_profiles')->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('status', 40)->default('draft')->index();
            $table->string('first_name');
            $table->string('last_name');
            $table->text('national_code_encrypted');
            $table->string('national_code_hash', 64)->index();
            $table->date('date_of_birth');
            $table->string('gender', 20);
            $table->string('city');
            $table->string('expected_video_text')->nullable();
            $table->json('required_corrections')->nullable();
            $table->string('provider_route')->nullable();
            $table->string('provider_slug')->nullable();
            $table->timestamp('submitted_at')->nullable()->index();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'version']);
        });

        Schema::create('identity_verification_artifacts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('submission_id')->constrained('identity_verification_submissions')->cascadeOnDelete();
            $table->string('type', 40); // national_card_front, selfie_video
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->string('original_name')->nullable();
            $table->timestamps();

            $table->unique(['submission_id', 'type']);
        });

        Schema::create('identity_verification_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('identity_verification_submissions')->cascadeOnDelete();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 40); // approve, reject, request_correction
            $table->string('reason_code', 80)->nullable();
            $table->text('reviewer_note')->nullable();
            $table->json('correction_items')->nullable();
            $table->timestamps();

            $table->index(['submission_id', 'created_at']);
        });

        Schema::create('identity_verification_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('capability', 80)->index();
            $table->string('provider', 80)->index();
            $table->string('route_id')->nullable();
            $table->string('status', 40)->index();
            $table->string('normalized_result', 40)->nullable()->index();
            $table->string('provider_code')->nullable();
            $table->text('provider_message')->nullable();
            $table->string('provider_request_id')->nullable()->index();
            $table->unsignedInteger('attempt_number')->default(1);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('identity_verification_routes', function (Blueprint $table) {
            $table->id();
            $table->string('capability', 80)->unique();
            $table->string('primary_provider', 80);
            $table->string('fallback_provider', 80)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('identity_provider_configs', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('label');
            $table->json('capabilities')->nullable();
            $table->text('credentials_encrypted')->nullable();
            $table->json('settings')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->string('last_test_status', 40)->nullable();
            $table->timestamp('last_tested_at')->nullable();
            $table->text('last_test_message')->nullable();
            $table->timestamps();
        });

        Schema::create('identity_verification_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('previous_level');
            $table->unsignedTinyInteger('new_level');
            $table->text('reason');
            $table->uuid('request_id')->nullable();
            $table->timestamps();
        });

        Schema::create('sat_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status', 40)->default('inactive')->index(); // inactive, active, suspended
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->string('activation_source')->nullable();
            $table->timestamps();
        });

        // Chunked backfill for existing students — Level 1 defaults.
        $now = now();
        DB::table('users')
            ->where('is_admin', false)
            ->orderBy('id')
            ->chunkById(500, function ($users) use ($now): void {
                $rows = [];
                foreach ($users as $user) {
                    $rows[] = [
                        'user_id' => $user->id,
                        'uuid' => (string) \Illuminate\Support\Str::uuid(),
                        'identity_status' => 'not_started',
                        'verification_level' => 1,
                        'mobile_ownership_status' => 'not_started',
                        'ownership_failed_attempts' => 0,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if ($rows !== []) {
                    DB::table('user_identity_profiles')->insert($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('sat_memberships');
        Schema::dropIfExists('identity_verification_overrides');
        Schema::dropIfExists('identity_provider_configs');
        Schema::dropIfExists('identity_verification_routes');
        Schema::dropIfExists('identity_verification_attempts');
        Schema::dropIfExists('identity_verification_reviews');
        Schema::dropIfExists('identity_verification_artifacts');
        Schema::dropIfExists('identity_verification_submissions');
        Schema::dropIfExists('user_identity_profiles');
    }
};
