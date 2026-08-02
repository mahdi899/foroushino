<?php

namespace Tests\Unit;

use App\Actions\Identity\PurgeIdentityVerificationArtifacts;
use App\Enums\IdentityVerificationStatus;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurgeIdentityVerificationArtifactsTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolve_keeper_prefers_active_queue_submission_over_empty_draft(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $profileId = \App\Models\UserIdentityProfile::query()->create([
            'user_id' => $user->id,
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'identity_status' => IdentityVerificationStatus::Submitted,
            'verification_level' => 1,
            'mobile_ownership_status' => \App\Enums\MobileOwnershipStatus::NotStarted,
        ])->id;

        $queued = IdentityVerificationSubmission::query()->create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'identity_profile_id' => $profileId,
            'version' => 2,
            'status' => IdentityVerificationStatus::Submitted,
            'first_name' => 'علی',
            'last_name' => 'تستی',
            'national_code_encrypted' => 'x',
            'national_code_hash' => 'hash-2',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
            'submitted_at' => now(),
        ]);

        $draft = IdentityVerificationSubmission::query()->create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'identity_profile_id' => $profileId,
            'version' => 3,
            'status' => IdentityVerificationStatus::Draft,
            'first_name' => 'علی',
            'last_name' => 'تستی',
            'national_code_encrypted' => 'x',
            'national_code_hash' => 'hash-3',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
        ]);

        \App\Models\IdentityVerificationArtifact::query()->create([
            'submission_id' => $queued->id,
            'type' => \App\Enums\IdentityArtifactType::NationalCardFront,
            'disk' => 'local',
            'path' => 'identity-verifications/test/card.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 10,
        ]);

        $keeper = app(PurgeIdentityVerificationArtifacts::class)->resolveKeeperSubmission($user->id);

        $this->assertNotNull($keeper);
        $this->assertSame($queued->id, $keeper->id);
        $this->assertNotSame($draft->id, $keeper->id);
    }
}
