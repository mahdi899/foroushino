<?php

namespace App\Enums;

use App\Models\Lead;
use App\Models\User;
use App\Services\Sms\AgentSmsLinkBuilder;

enum LeadSmsTemplate: string
{
    case Course = 'course';
    case Channel = 'channel';
    case Register = 'register';
    case Payment = 'payment';
    case Custom = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::Course => 'لینک دوره',
            self::Channel => 'لینک کانال',
            self::Register => 'لینک ثبت‌نام',
            self::Payment => 'لینک پرداخت',
            self::Custom => 'پیامک دلخواه',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Course => 'ارسال لینک معرفی دوره',
            self::Channel => 'ارسال لینک کانال تلگرام',
            self::Register => 'ارسال لینک ثبت‌نام',
            self::Payment => 'ارسال لینک پرداخت',
            self::Custom => 'متن دلخواه کارشناس',
        };
    }

    public function patternSettingKey(): string
    {
        return match ($this) {
            self::Course => 'meli_pattern_course',
            self::Channel => 'meli_pattern_channel',
            self::Register => 'meli_pattern_register',
            self::Payment => 'meli_pattern_payment',
            self::Custom => 'meli_pattern_custom',
        };
    }

    public function linkSettingKey(): ?string
    {
        return match ($this) {
            self::Course => 'meli_sms_link_course',
            self::Channel => 'meli_sms_link_channel',
            self::Register => 'meli_sms_link_register',
            self::Payment => 'meli_sms_link_payment',
            self::Custom => null,
        };
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return list<string>
     */
    public function variables(User $agent, Lead $lead, array $settings, ?string $customBody = null): array
    {
        return match ($this) {
            self::Course => [
                $lead->fullName(),
                AgentSmsLinkBuilder::withBase($agent, self::courseLink($lead, $settings), $settings),
            ],
            self::Channel, self::Register, self::Payment => [
                $lead->fullName(),
                AgentSmsLinkBuilder::for($agent, $this, $settings),
            ],
            self::Custom => [trim((string) $customBody)],
        };
    }

    /**
     * @param  array<string, mixed>  $settings
     */
    private static function courseLink(Lead $lead, array $settings): string
    {
        $lead->loadMissing('product');

        $productUrl = trim((string) ($lead->product?->landing_url ?? ''));
        if ($productUrl !== '') {
            return $productUrl;
        }

        return (string) ($settings['meli_sms_link_course'] ?? '');
    }
}
