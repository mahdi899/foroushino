<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Models\User;
use App\Services\Family\FamilyMediaIngestService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyMediaUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        Storage::fake('local');
    }

    private function manager(): User
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);

        return $admin;
    }

    public function test_chunk_session_rejects_oversized_image(): void
    {
        config(['family.media.max_image_mb' => 50]);

        $manager = $this->manager();
        $oversizedBytes = (51 * 1024 * 1024);

        $response = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/media/sessions', [
            'type' => 'image',
            'filename' => 'large.webp',
            'total_size' => $oversizedBytes,
            'chunk_size' => 5 * 1024 * 1024,
        ]);

        $response->assertStatus(422);
    }

    public function test_chunk_session_accepts_thirty_megabyte_video(): void
    {
        $manager = $this->manager();
        $size = 30 * 1024 * 1024;

        $response = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/media/sessions', [
            'type' => 'video',
            'filename' => 'clip.mp4',
            'total_size' => $size,
            'chunk_size' => 5 * 1024 * 1024,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.total_chunks', 6);
    }

    public function test_complete_session_rejects_size_mismatch(): void
    {
        $manager = $this->manager();
        $ingest = app(FamilyMediaIngestService::class);

        $session = $ingest->createChunkSession(
            $manager,
            'video',
            'clip.mp4',
            1024,
            512,
        );

        $disk = Storage::disk(config('family.media.temp_disk', 'local'));
        $disk->put($session->temp_path, str_repeat('a', 512));
        $session->update(['received_chunks' => 2, 'total_chunks' => 2]);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        $ingest->completeSession($session->fresh());
    }

    public function test_retry_command_requeues_failed_media_with_temp_file(): void
    {
        $manager = $this->manager();
        $tempPath = config('family.media.temp_path', 'family-ingest').'/retry-test.bin';
        Storage::disk('local')->put($tempPath, 'payload');

        $media = FamilyMedia::query()->create([
            'type' => 'video',
            'disk' => 'public',
            'temp_path' => $tempPath,
            'original_filename' => 'retry-test.bin',
            'mime_type' => 'video/mp4',
            'size' => 7,
            'status' => FamilyMediaStatus::Failed,
            'failure_reason' => 'FTP timeout',
            'uploaded_by' => $manager->id,
        ]);

        Artisan::call('family:retry-failed-media-transfers');

        $media->refresh();
        $this->assertNotSame(FamilyMediaStatus::Failed, $media->status);
        $this->assertNull($media->failure_reason);
    }

    public function test_simple_upload_uses_stream_without_loading_entire_file_in_memory(): void
    {
        $manager = $this->manager();
        $file = UploadedFile::fake()->create('voice.mp3', 128, 'audio/mpeg');

        $response = $this->actingAs($manager, 'sanctum')->post('/api/v1/family-manager/media', [
            'type' => 'voice',
            'file' => $file,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('family_media', [
            'type' => 'voice',
            'uploaded_by' => $manager->id,
        ]);
    }
}
