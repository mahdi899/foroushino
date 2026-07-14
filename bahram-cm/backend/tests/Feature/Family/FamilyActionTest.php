<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyAction;
use App\Models\FamilyPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class FamilyActionTest extends TestCase
{
    use RefreshDatabase;

    private function joinedUser(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();

        return $user;
    }

    private function postWithAction(string $type, array $config = [], ?int $followUpAfterMinutes = null): FamilyAction
    {
        $post = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        return FamilyAction::create([
            'post_id' => $post->id,
            'type' => $type,
            'prompt' => 'آیا امروز تمرین رو انجام دادی؟',
            'config' => $config,
            'follow_up_after_minutes' => $followUpAfterMinutes,
        ]);
    }

    public function test_member_can_respond_to_confirmation_action(): void
    {
        $user = $this->joinedUser();
        $action = $this->postWithAction('confirmation');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/actions/{$action->id}/respond", ['confirmed' => true]);

        $response->assertCreated()->assertJsonPath('data.already_responded', false);

        $this->assertDatabaseHas('family_action_responses', [
            'action_id' => $action->id,
            'user_id' => $user->id,
        ]);

        $this->assertDatabaseHas('family_post_stats', [
            'post_id' => $action->post_id,
            'action_responses_count' => 1,
        ]);
    }

    public function test_responding_twice_does_not_duplicate(): void
    {
        $user = $this->joinedUser();
        $action = $this->postWithAction('commitment');

        $this->actingAs($user, 'sanctum')->postJson("/api/v1/family/actions/{$action->id}/respond")->assertCreated();
        $second = $this->actingAs($user, 'sanctum')->postJson("/api/v1/family/actions/{$action->id}/respond");

        $second->assertOk()->assertJsonPath('data.already_responded', true);
        $this->assertDatabaseCount('family_action_responses', 1);
    }

    public function test_scale_action_validates_range(): void
    {
        $user = $this->joinedUser();
        $action = $this->postWithAction('scale', ['min' => 1, 'max' => 10]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/actions/{$action->id}/respond", ['score' => 15])
            ->assertUnprocessable();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/actions/{$action->id}/respond", ['score' => 7])
            ->assertCreated();
    }

    public function test_follow_up_job_is_queued_when_configured(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $action = $this->postWithAction('commitment', [], 30);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/actions/{$action->id}/respond")
            ->assertCreated();

        Queue::assertPushed(\App\Jobs\Family\ProcessActionFollowUpJob::class);
    }
}
