<?php

use App\Models\Lead;

beforeEach(function (): void {
    seedRoles();
});

it('lets an agent create a standalone follow-up for their own lead', function (): void {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'assigned_team_id' => $agent->team_id]);

    $response = $this->actingAs($agent)->postJson('/api/v1/followups', [
        'lead_id' => $lead->id,
        'kind' => 'call',
        'title' => 'پیگیری دستی',
        'due_at' => now()->addDay()->toIso8601String(),
        'priority' => 2,
        'note' => 'یادداشت',
    ]);

    $response->assertCreated()->assertJsonPath('data.title', 'پیگیری دستی');
    expect($lead->fresh()->next_followup_at)->not->toBeNull();
    $this->assertDatabaseHas('follow_ups', ['lead_id' => $lead->id, 'agent_id' => $agent->id]);
});

it('forbids creating a follow-up for a lead owned by another agent', function (): void {
    $agent = makeAgent();
    $other = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $other->id, 'assigned_team_id' => $other->team_id]);

    $this->actingAs($agent)->postJson('/api/v1/followups', [
        'lead_id' => $lead->id,
        'kind' => 'call',
        'title' => 'پیگیری دستی',
        'due_at' => now()->addDay()->toIso8601String(),
        'priority' => 2,
    ])->assertForbidden();
});

it('lets an agent cancel their own payment-pending sale', function (): void {
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'payment_pending');

    $this->actingAs($agent)->postJson("/api/v1/sales/{$sale->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    expect($sale->fresh()->status->value)->toBe('cancelled');
});

it('refuses to cancel a sale that already moved past payment', function (): void {
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'confirmed');

    $this->actingAs($agent)->postJson("/api/v1/sales/{$sale->id}/cancel")
        ->assertStatus(422);
});

it('lets an agent reclaim a lead that was returned to the pool', function (): void {
    $agent = makeAgent();
    $lead = makeLead([
        'returned_to_pool' => true,
        'assigned_agent_id' => null,
        'status' => 'returned_to_pool',
    ]);

    $this->actingAs($agent)->postJson("/api/v1/leads/{$lead->id}/reclaim")
        ->assertOk()
        ->assertJsonPath('data.assigned_agent_id', $agent->id);

    $fresh = $lead->fresh();
    expect($fresh->returned_to_pool)->toBeFalse();
    expect($fresh->assigned_agent_id)->toBe($agent->id);
    expect($fresh->status->value)->toBe('assigned');
});

it('refuses to reclaim a lead that is not in the pool', function (): void {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'returned_to_pool' => false]);

    $this->actingAs($agent)->postJson("/api/v1/leads/{$lead->id}/reclaim")
        ->assertForbidden();
});
