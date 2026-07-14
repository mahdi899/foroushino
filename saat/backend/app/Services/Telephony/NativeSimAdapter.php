<?php

namespace App\Services\Telephony;

use App\Models\Call;
use App\Models\Lead;
use Illuminate\Support\Str;

class NativeSimAdapter
{
    /**
     * @return array<string, mixed>
     */
    public function startSession(Call $call, Lead $lead): array
    {
        return [
            'adapter' => 'native_sim',
            'provider_call_id' => 'sim-'.$call->id.'-'.Str::lower(Str::random(8)),
            'dial_uri' => 'tel:'.$lead->phone,
            'requires_reconciliation' => true,
        ];
    }
}
