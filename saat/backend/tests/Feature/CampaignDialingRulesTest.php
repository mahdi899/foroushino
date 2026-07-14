<?php

use App\Actions\Leads\AssignNextLeadAction;
use App\Models\Campaign;
use App\Services\Campaign\CampaignDialingPolicy;
use App\Services\Telephony\CallOrchestrator;

beforeEach(function () {
    seedRoles();
});

function makeCampaign(array $attrs = []): Campaign
{
    $product = makeProduct();

    return Campaign::query()->create(array_merge([
        'name' => 'کمپین تست',
        'product_id' => $product->id,
        'source' => 'manual',
        'is_active' => true,
        'priority' => 80,
        'max_daily_attempts' => 3,
        'max_total_attempts' => 12,
        'retry_cooldown_minutes' => 60,
        'allowed_hours_start' => '00:00',
        'allowed_hours_end' => '23:59',
        'sla_callback_minutes' => 120,
    ], $attrs));
}

it('blocks dialing when daily campaign attempts are exhausted', function () {
    $agent = makeAgent();
    $campaign = makeCampaign(['max_daily_attempts' => 1]);
    $lead = makeLead(['campaign_id' => $campaign->id, 'assigned_agent_id' => $agent->id]);

    startCallFor($agent, $lead);

    $eligibility = app(CampaignDialingPolicy::class)->canDial($lead->fresh());

    expect($eligibility->allowed)->toBeFalse();
});

it('blocks dialing during campaign retry cooldown', function () {
    $agent = makeAgent();
    $campaign = makeCampaign(['retry_cooldown_minutes' => 120]);
    $lead = makeLead(['campaign_id' => $campaign->id, 'assigned_agent_id' => $agent->id, 'call_count' => 1]);

    startCallFor($agent, $lead);

    $eligibility = app(CampaignDialingPolicy::class)->canDial($lead->fresh());

    expect($eligibility->allowed)->toBeFalse();
});

it('excludes cooldown leads from next assignment', function () {
    $agent = makeAgent();
    $campaign = makeCampaign(['retry_cooldown_minutes' => 120]);
    $blocked = makeLead(['campaign_id' => $campaign->id, 'conversion_probability' => 99]);
    $available = makeLead(['conversion_probability' => 50]);

    startCallFor($agent, $blocked);

    $result = app(AssignNextLeadAction::class)->execute($agent);

    expect($result['lead'])->not->toBeNull();
    expect($result['lead']->id)->toBe($available->id);
});

it('rejects call start when campaign allowed hours have passed', function () {
    $agent = makeAgent();
    $campaign = makeCampaign([
        'allowed_hours_start' => '00:00',
        'allowed_hours_end' => '00:01',
    ]);
    $lead = makeLead(['campaign_id' => $campaign->id, 'assigned_agent_id' => $agent->id]);

    expect(fn () => app(CallOrchestrator::class)->start($agent, $lead))
        ->toThrow(\Symfony\Component\HttpKernel\Exception\HttpException::class);
});

it('prioritises higher-priority campaign leads in assignment', function () {
    $agent = makeAgent();
    $low = makeCampaign(['priority' => 10, 'name' => 'کم']);
    $high = makeCampaign(['priority' => 90, 'name' => 'زیاد']);
    $lowLead = makeLead(['campaign_id' => $low->id, 'conversion_probability' => 40]);
    $highLead = makeLead(['campaign_id' => $high->id, 'conversion_probability' => 40]);

    $result = app(AssignNextLeadAction::class)->execute($agent);

    expect($result['lead']->id)->toBe($highLead->id);
    expect($lowLead->fresh()->assigned_agent_id)->toBeNull();
});
