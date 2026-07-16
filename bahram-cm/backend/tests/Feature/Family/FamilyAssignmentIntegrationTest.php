<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyEntrySource;
use App\Models\Family;
use App\Models\FamilyEntryEvent;
use App\Models\FamilyMembership;
use App\Models\User;
use App\Services\Family\EntryContext;
use App\Services\Family\FamilyAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyAssignmentIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_assigns_user_to_best_matching_family(): void
    {
        $user = User::factory()->create();

        $event = FamilyEntryEvent::query()->create([
            'name' => 'Reel 482',
            'type' => 'instagram_reel',
            'external_reference' => 'reel-482',
        ]);

        $match = Family::query()->create([
            'internal_name' => 'سپهر',
            'lifecycle' => 'forming',
            'member_count' => 100,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'primary_source' => 'instagram',
            'entry_event_id' => $event->id,
            'accepting_members' => true,
        ]);

        $other = Family::query()->create([
            'internal_name' => 'آبان',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'primary_source' => 'website',
            'entry_event_id' => null,
            'accepting_members' => true,
        ]);

        for ($i = 0; $i < 58; $i++) {
            FamilyMembership::query()->create([
                'user_id' => User::factory()->create()->id,
                'family_id' => $match->id,
                'entry_source' => FamilyEntrySource::Instagram->value,
                'entry_event_id' => $event->id,
                'joined_at' => now(),
            ]);
        }

        for ($i = 0; $i < 42; $i++) {
            FamilyMembership::query()->create([
                'user_id' => User::factory()->create()->id,
                'family_id' => $match->id,
                'entry_source' => FamilyEntrySource::Website->value,
                'joined_at' => now(),
            ]);
        }

        $match->update(['member_count' => 100]);

        $context = EntryContext::fromArray([
            'source' => 'instagram',
            'entry_event_ref' => 'reel-482',
        ]);

        $membership = app(FamilyAssignmentService::class)->assign($user, $context);

        $this->assertSame($match->id, $membership->family_id);
    }
}
