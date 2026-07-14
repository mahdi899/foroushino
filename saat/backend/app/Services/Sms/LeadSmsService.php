<?php

namespace App\Services\Sms;

use App\Enums\ActivityKind;
use App\Enums\LeadSmsTemplate;
use App\Models\AppSetting;
use App\Models\Lead;
use App\Models\User;
use App\Services\ActivityLogService;
use RuntimeException;

class LeadSmsService
{
    public function __construct(
        private readonly MelipayamakClient $melipayamak,
        private readonly ActivityLogService $activity,
    ) {}

    /**
     * @return list<array{id: string, label: string, description: string}>
     */
    public function availableTemplates(): array
    {
        $settings = AppSetting::allKeyed();
        $templates = [];

        foreach (LeadSmsTemplate::cases() as $template) {
            if ($this->patternId($template, $settings) <= 0) {
                continue;
            }

            $templates[] = [
                'id' => $template->value,
                'label' => $template->label(),
                'description' => $template->description(),
            ];
        }

        return $templates;
    }

    public function send(User $user, Lead $lead, LeadSmsTemplate $template, ?string $customBody = null): string
    {
        $settings = AppSetting::allKeyed();
        $bodyId = $this->patternId($template, $settings);

        if ($bodyId <= 0) {
            throw new RuntimeException('پترن این بخش در تنظیمات ملی پیامک ثبت نشده است.');
        }

        if ($template === LeadSmsTemplate::Custom) {
            $customBody = trim((string) $customBody);
            if ($customBody === '') {
                throw new RuntimeException('متن پیامک دلخواه خالی است.');
            }
        }

        $variables = $template->variables($user, $lead, $settings, $customBody);

        if ($template !== LeadSmsTemplate::Custom) {
            $link = $variables[1] ?? '';
            if ($link === '') {
                throw new RuntimeException('لینک این بخش در تنظیمات سیستم ثبت نشده است.');
            }
        }

        $recId = $this->melipayamak->sendByBaseNumber($lead->phone, $bodyId, $variables);

        $this->activity->log(
            $user,
            ActivityKind::Lead,
            "پیامک {$template->label()} برای {$lead->fullName()}",
            "rec_id={$recId}",
        );

        return $recId;
    }

    /**
     * @param  array<string, mixed>  $settings
     */
    private function patternId(LeadSmsTemplate $template, array $settings): int
    {
        return (int) ($settings[$template->patternSettingKey()] ?? 0);
    }
}
