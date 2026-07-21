<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Models\Family;
use App\Models\FamilyMedia;
use App\Models\FamilyMembership;
use App\Models\FamilyStory;
use App\Models\User;
use App\Services\Family\FamilyStoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyStoryAudienceTest extends TestCase
{
    use RefreshDatabase;

    public function test_included_story_is_only_visible_to_targeted_family(): void
    {
        $publisher = User::factory()->create(['is_admin' => true]);
        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Image->value,
            'status' => FamilyMediaStatus::Ready->value,
            'disk' => 'public',
            'storage_path' => 'family/stories/test.webp',
            'width' => 1080,
            'height' => 1920,
            'uploaded_by' => $publisher->id,
        ]);

        $familyA = Family::query()->create(['internal_name' => 'A', 'join_code' => 'AAAAA', 'member_count' => 1]);
        $familyB = Family::query()->create(['internal_name' => 'B', 'join_code' => 'BBBBB', 'member_count' => 1]);

        $memberA = User::factory()->create();
        $memberB = User::factory()->create();
        FamilyMembership::query()->create(['user_id' => $memberA->id, 'family_id' => $familyA->id, 'joined_at' => now()]);
        FamilyMembership::query()->create(['user_id' => $memberB->id, 'family_id' => $familyB->id, 'joined_at' => now()]);

        app(FamilyStoryService::class)->publish(
            $publisher,
            $media,
            'فقط الف',
            'include',
            [$familyA->id],
        );

        $this->actingAs($memberA)
            ->getJson('/api/v1/family/stories')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($memberB)
            ->getJson('/api/v1/family/stories')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->assertTrue(app(FamilyStoryService::class)->hasActiveStories($familyA->id));
        $this->assertFalse(app(FamilyStoryService::class)->hasActiveStories($familyB->id));
        $this->assertFalse(app(FamilyStoryService::class)->hasActiveStories());
    }

    public function test_all_audience_story_is_visible_to_guests_flag(): void
    {
        $publisher = User::factory()->create(['is_admin' => true]);
        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Image->value,
            'status' => FamilyMediaStatus::Ready->value,
            'disk' => 'public',
            'storage_path' => 'family/stories/all.webp',
            'width' => 1080,
            'height' => 1920,
            'uploaded_by' => $publisher->id,
        ]);

        app(FamilyStoryService::class)->publish($publisher, $media, 'همه', 'all', []);

        $this->assertTrue(app(FamilyStoryService::class)->hasActiveStories());
        $this->assertSame(1, FamilyStory::query()->count());
    }
}
