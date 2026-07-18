<?php

namespace App\Services\Sms;

use App\Enums\LeadSmsTemplate;
use App\Models\User;

use App\Support\FlexibleLink;

class AgentSmsLinkBuilder
{
    /**
     * @param  array<string, mixed>  $settings
     */
    public static function for(User $agent, LeadSmsTemplate $template, array $settings): string
    {
        $key = $template->linkSettingKey();
        if ($key === null) {
            return '';
        }

        return self::withBase($agent, (string) ($settings[$key] ?? ''));
    }

    public static function withBase(User $agent, string $base, array $settings = []): string
    {
        $base = FlexibleLink::toAbsolute($base, $settings);
        $base = rtrim(trim($base), '/');
        if ($base === '') {
            return '';
        }

        $code = $agent->ensureReferralCode();
        $separator = str_contains($base, '?') ? '&' : '?';

        return "{$base}{$separator}ref={$code}";
    }
}
