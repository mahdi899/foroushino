<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Services\ChatbotService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

/**
 * Canonical brand social URLs for site footer, chatbot contacts, and student checklist.
 *
 * Bot:       https://t.me/RostamiAppBot
 * Channel:   https://t.me/rostami_cm
 * Rubika:    https://rubika.ir/live_rostami
 * Instagram: https://www.instagram.com/live_rostami
 */
class BrandSocialLinksSeeder extends Seeder
{
    public function run(): void
    {
        $this->syncChatbotContacts();
        $this->syncAcademyLinks();
        ChatbotService::forgetCachedConfig();
        Cache::forget('settings.public');
    }

    private function syncChatbotContacts(): void
    {
        $row = Setting::query()
            ->where('group', 'chatbot')
            ->where('key', 'config')
            ->first();

        $value = is_array($row?->value) ? $row->value : [];
        $contacts = is_array($value['contacts'] ?? null) ? $value['contacts'] : [];

        $contacts['telegram'] = [
            'enabled' => (bool) ($contacts['telegram']['enabled'] ?? true),
            'id' => 'rostami_cm',
            'label' => '@rostami_cm',
        ];
        $contacts['rubika'] = [
            'enabled' => (bool) ($contacts['rubika']['enabled'] ?? true),
            'id' => 'live_rostami',
            'label' => '@live_rostami',
        ];
        $contacts['instagram'] = [
            'enabled' => (bool) ($contacts['instagram']['enabled'] ?? true),
            'id' => 'live_rostami',
            'label' => '@live_rostami',
        ];

        $value['contacts'] = $contacts;

        Setting::query()->updateOrCreate(
            ['group' => 'chatbot', 'key' => 'config'],
            ['value' => $value],
        );
    }

    private function syncAcademyLinks(): void
    {
        $pairs = [
            'telegram_channel' => ['url' => 'https://t.me/rostami_cm'],
            'rubika_channel' => ['url' => 'https://rubika.ir/live_rostami'],
            'telegram_bot' => ['url' => 'https://t.me/RostamiAppBot'],
        ];

        foreach ($pairs as $key => $value) {
            Setting::query()->updateOrCreate(
                ['group' => 'links', 'key' => $key],
                ['value' => $value],
            );
        }
    }
}
