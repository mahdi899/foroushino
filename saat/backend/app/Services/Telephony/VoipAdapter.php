<?php

namespace App\Services\Telephony;

use App\Models\AppSetting;
use App\Models\Call;
use App\Models\Lead;
use Illuminate\Support\Str;

class VoipAdapter implements \App\Contracts\Telephony\VoipProviderInterface
{
    /**
     * @return array<string, mixed>
     */
    public function startSession(Call $call, Lead $lead): array
    {
        if (! $this->healthCheck()) {
            abort(503, 'سرویس VoIP در دسترس نیست.');
        }

        $provider = AppSetting::string('voip_provider', 'asterisk');
        $token = Str::random(48);

        return [
            'adapter' => 'voip',
            'provider' => $provider,
            'provider_call_id' => 'voip-'.$call->id.'-'.Str::lower(Str::random(8)),
            'session_token' => $token,
            'expires_at' => now()->addMinutes(5)->toIso8601String(),
            'requires_reconciliation' => false,
        ];
    }

    public function healthCheck(): bool
    {
        if (! AppSetting::bool('voip_enabled', false)) {
            return false;
        }

        // Provider-specific health checks can be plugged in here.
        return true;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function handleWebhook(array $payload): void
    {
        // Reserved for provider event ingestion (ringing, answered, hangup, recording URL).
    }
}
