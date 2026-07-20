<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingService
{
    public const PUBLIC_GROUPS = ['brand', 'contact', 'site'];

    public function group(string $group): array
    {
        return Setting::where('group', $group)
            ->pluck('value', 'key')
            ->toArray();
    }

    public function publicSettings(): array
    {
        return Cache::remember('settings.public', 300, function () {
            $data = [];
            foreach (self::PUBLIC_GROUPS as $group) {
                $data[$group] = $this->group($group);
            }

            return $data;
        });
    }

    public function updateGroup(string $group, array $pairs): array
    {
        foreach ($pairs as $key => $value) {
            Setting::updateOrCreate(['group' => $group, 'key' => $key], ['value' => $value]);
        }

        if ($group === 'cache') {
            Cache::forget('cache.public.config');
        }

        if ($group === 'media') {
            app(ImageOptimizerSettingsService::class)->forgetCachedConfig();
            MediaHostSettingsService::forgetCachedConfig();
        }

        if ($group === 'chatbot') {
            ChatbotService::forgetCachedConfig();
            ChatbotService::forgetCachedOperatorProfiles();
        }

        if ($group === 'captcha') {
            CaptchaService::forgetCachedConfig();
        }

        if ($group === TelegramInfrastructureService::GROUP) {
            TelegramInfrastructureService::forgetCachedConfig();
        }

        Cache::forget('settings.public');

        return $this->group($group);
    }
}
