<?php

namespace App\Services\Telephony;

use App\Enums\CallMethod;
use App\Enums\CallState;
use App\Enums\DurationSource;
use App\Models\AppSetting;
use App\Models\Call;
use App\Models\CallEvent;
use App\Models\Lead;
use App\Models\User;
use App\Services\Campaign\CampaignDialingPolicy;
use Illuminate\Support\Str;

class CallOrchestrator
{
    public function __construct(
        private readonly VoipAdapter $voip,
        private readonly NativeSimAdapter $native,
        private readonly CampaignDialingPolicy $dialingPolicy,
    ) {}

    /**
     * @return array{call: Call, capabilities: array<string, mixed>}
     */
    public function start(User $agent, Lead $lead, ?CallMethod $method = null): array
    {
        $eligibility = $this->dialingPolicy->canDial($lead->loadMissing('campaign'));
        abort_unless($eligibility->allowed, 422, $eligibility->reason ?? 'این مشتری در حال حاضر قابل تماس نیست.');

        $config = AppSetting::telephonyConfig();
        $method ??= CallMethod::tryFrom($config['default_call_method'] ?? 'native') ?? CallMethod::Native;

        if ($method === CallMethod::Voip && ! $config['voip_enabled']) {
            if ($config['voip_fallback_to_native'] && $config['native_call_enabled']) {
                $method = CallMethod::Native;
            } else {
                abort(422, 'تماس VoIP در حال حاضر غیرفعال است.');
            }
        }

        if ($method === CallMethod::Native && ! $config['native_call_enabled']) {
            abort(422, 'تماس سیم‌کارت غیرفعال است.');
        }

        $correlationId = (string) Str::uuid();

        $call = Call::query()->create([
            'lead_id' => $lead->id,
            'agent_id' => $agent->id,
            'method' => $method,
            'state' => CallState::Created,
            'started_at' => now(),
            'duration_source' => $method === CallMethod::Native
                ? DurationSource::Unverified
                : DurationSource::Provider,
            'correlation_id' => $correlationId,
        ]);

        $this->recordEvent($call, 'call.created', ['method' => $method->value]);

        $adapter = $method === CallMethod::Voip ? $this->voip : $this->native;
        $session = $adapter->startSession($call, $lead);

        $call->state = CallState::Dialing;
        $call->provider_call_id = $session['provider_call_id'] ?? null;
        $call->save();

        $this->recordEvent($call, 'call.dialing', $session);

        return [
            'call' => $call->fresh(),
            'capabilities' => $this->capabilities(),
            'session' => $session,
        ];
    }

    public function reconcileNative(Call $call, string $outcome): Call
    {
        abort_unless($call->method === CallMethod::Native, 422, 'فقط تماس سیم‌کارت قابل تطبیق است.');

        $call->state = match ($outcome) {
            'answered' => CallState::Answered,
            'no_answer', 'cancelled' => CallState::Ended,
            default => CallState::Ended,
        };

        if ($call->state === CallState::Answered) {
            $call->answered_at = now();
        }

        if ($call->state === CallState::Ended && ! $call->ended_at) {
            $call->ended_at = now();
        }

        $call->disconnect_reason = $outcome;
        $call->save();

        $this->recordEvent($call, 'call.reconciled', ['outcome' => $outcome]);

        return $call->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function capabilities(): array
    {
        $config = AppSetting::telephonyConfig();

        return [
            'native_call_enabled' => (bool) $config['native_call_enabled'],
            'voip_enabled' => (bool) $config['voip_enabled'],
            'default_call_method' => (string) $config['default_call_method'],
            'voip_provider' => (string) $config['voip_provider'],
            'voip_fallback_to_native' => (bool) $config['voip_fallback_to_native'],
            'voip_healthy' => $this->voip->healthCheck(),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function recordEvent(Call $call, string $event, array $payload = []): void
    {
        CallEvent::query()->create([
            'call_id' => $call->id,
            'event' => $event,
            'payload' => $payload,
            'occurred_at' => now(),
        ]);
    }
}
