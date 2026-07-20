<?php

namespace Tests\Unit\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Models\FamilyMedia;
use App\Models\User;
use App\Services\Family\FamilyMediaSettingsService;
use Database\Seeders\Support\FamilyDemoPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyDemoPublisherTest extends TestCase
{
    use RefreshDatabase;

    public function test_publishes_demo_file_to_ftp_disk_when_configured(): void
    {
        Storage::fake('public');
        Storage::fake('family_media_ftp');

        $this->mock(FamilyMediaSettingsService::class, function ($mock): void {
            $mock->shouldReceive('uploadDisk')->andReturn('family_media_ftp');
        });

        $path = 'media/family/demo/demo-voice.mp3';
        Storage::disk('public')->put($path, 'demo-audio-bytes');

        $uploader = User::factory()->create();

        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Voice,
            'disk' => 'public',
            'storage_path' => $path,
            'mime_type' => 'audio/mpeg',
            'status' => FamilyMediaStatus::Ready,
            'uploaded_by' => $uploader->id,
        ]);

        $publisher = new FamilyDemoPublisher;
        $ok = $publisher->publishMediaToDownloadHost($media);

        $this->assertTrue($ok);
        $media->refresh();
        $this->assertSame('family_media_ftp', $media->disk);
        $this->assertTrue(Storage::disk('family_media_ftp')->exists($path));
    }

    public function test_keeps_public_disk_when_ftp_not_configured(): void
    {
        Storage::fake('public');

        $this->mock(FamilyMediaSettingsService::class, function ($mock): void {
            $mock->shouldReceive('uploadDisk')->andReturn('public');
        });

        $path = 'media/family/demo/demo-voice.mp3';
        Storage::disk('public')->put($path, 'demo-audio-bytes');

        $uploader = User::factory()->create();

        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Voice,
            'disk' => 'public',
            'storage_path' => $path,
            'mime_type' => 'audio/mpeg',
            'status' => FamilyMediaStatus::Ready,
            'uploaded_by' => $uploader->id,
        ]);

        $publisher = new FamilyDemoPublisher;
        $ok = $publisher->publishMediaToDownloadHost($media);

        $this->assertTrue($ok);
        $media->refresh();
        $this->assertSame('public', $media->disk);
    }
}
