<?php

namespace App\Http\Controllers\Api\V1\Misc;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Support\ApiResponse;
use App\Support\BusinessDate;
use App\Support\TeamCapacity;
use Illuminate\Http\JsonResponse;

class AppConfigController extends Controller
{
    /** Runtime settings exposed to all authenticated app users. */
    public function __invoke(): JsonResponse
    {
        $settings = AppSetting::allKeyed();
        $telephony = AppSetting::telephonyConfig();

        return ApiResponse::success([
            'min_call_duration_sec' => (int) ($settings['min_call_duration_sec'] ?? 0),
            'call_lock_minutes' => AppSetting::callLockMinutes(),
            'lead_pool_auto_return_hours' => (int) ($settings['lead_pool_auto_return_hours'] ?? 48),
            'power_dial_default' => filter_var($settings['power_dial_default'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'qa_sample_percent' => (int) ($settings['qa_sample_percent'] ?? 10),
            'payout_minimum_amount' => (int) ($settings['payout_minimum_amount'] ?? 100_000),
            'native_call_enabled' => (bool) $telephony['native_call_enabled'],
            'voip_enabled' => (bool) $telephony['voip_enabled'],
            'default_call_method' => (string) $telephony['default_call_method'],
            'voip_provider' => (string) $telephony['voip_provider'],
            'voip_fallback_to_native' => (bool) $telephony['voip_fallback_to_native'],
            'business_timezone' => BusinessDate::timezone(),
            'business_date' => BusinessDate::dateKey(),
            'agents_per_team' => TeamCapacity::AGENTS_PER_TEAM,
        ]);
    }
}
