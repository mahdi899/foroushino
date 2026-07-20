<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Enums\Family\FamilyPostBlockType;
use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyMedia;
use App\Models\FamilyPost;
use App\Models\FamilyPostBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyMediaStreamApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_stream_published_post_video(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $author = User::factory()->create();

        $path = 'media/family/2026/07/video/test-stream.mp4';
        Storage::disk('public')->put($path, 'fake-video-bytes');

        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Video,
            'disk' => 'public',
            'storage_path' => $path,
            'mime_type' => 'video/mp4',
            'status' => FamilyMediaStatus::Ready,
            'uploaded_by' => $author->id,
        ]);

        $post = FamilyPost::query()->create([
            'author_id' => $author->id,
            'type' => 'video',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        FamilyPostBlock::query()->create([
            'post_id' => $post->id,
            'type' => FamilyPostBlockType::Video,
            'position' => 0,
            'media_id' => $media->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->get("/api/v1/family/media/{$media->id}/stream");

        $response->assertOk();
        $response->assertHeader('content-type', 'video/mp4');
        $response->assertHeader('accept-ranges', 'bytes');
    }

    public function test_stream_rejects_media_not_in_published_feed(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $path = 'media/family/2026/07/video/orphan.mp4';
        Storage::disk('public')->put($path, 'fake-video-bytes');

        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Video,
            'disk' => 'public',
            'storage_path' => $path,
            'mime_type' => 'video/mp4',
            'status' => FamilyMediaStatus::Ready,
            'uploaded_by' => $user->id,
        ]);

        $this->actingAs($user, 'sanctum')
            ->get("/api/v1/family/media/{$media->id}/stream")
            ->assertNotFound();
    }
}
