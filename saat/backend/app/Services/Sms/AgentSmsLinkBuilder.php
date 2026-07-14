<?php

namespace App\Services\Sms;

use App\Enums\LeadSmsTemplate;
use App\Models\User;

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

        $base = rtrim((string) ($settings[$key] ?? ''), '/');
        if ($base === '') {
            return '';
        }

        $code = $agent->ensureReferralCode();
        $separator = str_contains($base, '?') ? '&' : '?';

        return "{$base}{$separator}ref={$code}";
    }
}
