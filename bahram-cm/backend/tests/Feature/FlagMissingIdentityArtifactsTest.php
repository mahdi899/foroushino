<?php

namespace Tests\Feature;

use App\Actions\Identity\FlagMissingIdentityArtifacts;
use App\Enums\IdentityArtifactType;
use App\Enums\IdentityVerificationStatus;
use App\Models\IdentityVerificationArtifact;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FlagMissingIdentityArtifactsTest extends TestCase
{
    use RefreshDatabase;

    public function test_flags_queue_submission_when_artifact_file_is_missing(): void
    {
        Storage::fake('local');
        config(['bahram.uploads.private_disk' => 'local']);

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110077']);
        $profile = \App\Models\UserIdentityProfile::query()->create([
            'user_id' => $student->id,
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'identity_status' => IdentityVerificationStatus::Submitted,
            'verification_level' => 1,
            'mobile_ownership_status' => \App\Enums\MobileOwnershipStatus::NotStarted,
        ]);

        $submission = IdentityVerificationSubmission::query()->create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $student->id,
            'identity_profile_id' => $profile->id,
            'version' => 1,
            'status' => IdentityVerificationStatus::Submitted,
            'first_name' => 'علی',
            'last_name' => 'تستی',
            'national_code_encrypted' => 'x',
            'national_code_hash' => 'hash',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
            'submitted_at' => now(),
        ]);

        IdentityVerificationArtifact::query()->create([
            'submission_id' => $submission->id,
            'type' => IdentityArtifactType::NationalCardFront,
            'disk' => 'local',
            'path' => 'identity-verifications/missing/card.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 10,
        ]);

        $stats = app(FlagMissingIdentityArtifacts::class)->flagQueueSubmissions();

        $this->assertSame(1, $stats['flagged']);
        $this->assertSame(IdentityVerificationStatus::NeedsCorrection, $submission->fresh()->status);
        $this->assertSame(IdentityVerificationStatus::NeedsCorrection, $profile->fresh()->identity_status);
        $this->assertDatabaseMissing('identity_verification_artifacts', [
            'submission_id' => $submission->id,
        ]);
    }
}
