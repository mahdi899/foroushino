<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyEntrySource;
use App\Enums\Family\FamilyLifecycle;
use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostBlockType;
use App\Enums\Family\FamilyPostStatus;
use App\Models\Family;
use App\Models\FamilyMedia;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\FamilyPostBlock;
use App\Models\FamilyPostTarget;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyMediaStreamApiTest extends TestCase
{
    use RefreshDatabase;

    private function createFamily(string $name = 'family-a'): Family
    {
        return Family::query()->create([
            'internal_name' => $name,
            'lifecycle' => FamilyLifecycle::Active,
            'member_count' => 1,
            'capacity_target' => 10,
            'capacity_min' => 1,
            'capacity_max' => 20,
        ]);
    }

    private function addMember(User $user, Family $family): void
    {
        FamilyMembership::query()->create([
            'user_id' => $user->id,
            'family_id' => $family->id,
            'entry_source' => FamilyEntrySource::Website->value,
            'joined_at' => now(),
        ]);
    }

    public function test_member_can_stream_published_post_video(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $author = User::factory()->create();
        $family = $this->createFamily();
        $this->addMember($user, $family);

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
        $this->assertStringContainsString('inline', (string) $response->headers->get('content-disposition'));
    }

    public function test_stream_honors_range_requests_for_video(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $author = User::factory()->create();
        $family = $this->createFamily();
        $this->addMember($user, $family);

        $path = 'media/family/2026/07/video/range-test.mp4';
        Storage::disk('public')->put($path, str_repeat('a', 128));

        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Video,
            'disk' => 'public',
            'storage_path' => $path,
            'mime_type' => 'application/octet-stream',
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
            ->withHeader('Range', 'bytes=0-15')
            ->get("/api/v1/family/media/{$media->id}/stream");

        $response->assertStatus(206);
        $response->assertHeader('content-type', 'video/mp4');
        $response->assertHeader('accept-ranges', 'bytes');
        $response->assertHeader('content-range', 'bytes 0-15/128');
        $response->assertHeader('content-length', '16');
    }

    public function test_stream_rejects_media_not_in_published_feed(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $family = $this->createFamily();
        $this->addMember($user, $family);

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

    public function test_stream_rejects_non_member(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $author = User::factory()->create();

        $path = 'media/family/2026/07/video/member-only.mp4';
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

        $this->actingAs($user, 'sanctum')
            ->get("/api/v1/family/media/{$media->id}/stream")
            ->assertForbidden();
    }

    public function test_stream_rejects_post_not_visible_to_members_family(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $author = User::factory()->create();
        $memberFamily = $this->createFamily('member-family');
        $targetFamily = $this->createFamily('target-family');
        $this->addMember($user, $memberFamily);

        $path = 'media/family/2026/07/video/family-only.mp4';
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
            'audience_mode' => FamilyPostAudienceMode::Include->value,
            'published_at' => now(),
        ]);

        FamilyPostTarget::query()->create([
            'post_id' => $post->id,
            'family_id' => $targetFamily->id,
        ]);

        FamilyPostBlock::query()->create([
            'post_id' => $post->id,
            'type' => FamilyPostBlockType::Video,
            'position' => 0,
            'media_id' => $media->id,
        ]);

        $this->actingAs($user, 'sanctum')
            ->get("/api/v1/family/media/{$media->id}/stream")
            ->assertNotFound();
    }
}
