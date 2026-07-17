<?php

namespace Database\Seeders;

use App\Modules\TelegramBot\Models\TelegramSupportCategory;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use Illuminate\Database\Seeder;

class TelegramBotSeeder extends Seeder
{
    public function run(): void
    {
        /** @var TelegramBotRepository $bots */
        $bots = app(TelegramBotRepository::class);

        foreach ((array) config('telegram_bot.bots', []) as $configKey => $entry) {
            $key = (string) ($entry['key'] ?? $configKey);
            $bots->upsertFromConfig($key, $entry);
        }

        $categories = [
            ['key' => 'purchase', 'title_fa' => 'خرید و پرداخت', 'sort_order' => 1],
            ['key' => 'campaign_course', 'title_fa' => 'دوره کمپین‌نویسی', 'sort_order' => 2],
            ['key' => 'sat', 'title_fa' => 'سات', 'sort_order' => 3],
            ['key' => 'seminar', 'title_fa' => 'سمینار', 'sort_order' => 4],
            ['key' => 'family', 'title_fa' => 'خانواده', 'sort_order' => 5],
            ['key' => 'identity', 'title_fa' => 'احراز هویت', 'sort_order' => 6],
            ['key' => 'reference_channel', 'title_fa' => 'کانال مرجع', 'sort_order' => 7],
            ['key' => 'technical', 'title_fa' => 'مشکلات فنی', 'sort_order' => 8],
            ['key' => 'sales', 'title_fa' => 'همکاری و فروش', 'sort_order' => 9],
            ['key' => 'other', 'title_fa' => 'سایر', 'sort_order' => 10],
        ];

        foreach ($categories as $category) {
            TelegramSupportCategory::query()->updateOrCreate(
                ['key' => $category['key']],
                $category + ['is_active' => true],
            );
        }

        $permanentIds = array_values(array_filter(array_map(
            'intval',
            (array) config('telegram_bot.permanent_admins.telegram_user_ids', []),
        )));
        $permanentUsernames = array_values(array_filter(array_map(
            static fn ($value): string => strtolower(ltrim((string) $value, '@')),
            (array) config('telegram_bot.permanent_admins.usernames', []),
        )));

        if ($permanentIds !== []) {
            \App\Modules\TelegramBot\Models\TelegramAccount::query()
                ->whereIn('telegram_user_id', $permanentIds)
                ->update(['is_bot_admin' => true]);
        }

        if ($permanentUsernames !== []) {
            foreach (\App\Modules\TelegramBot\Models\TelegramAccount::query()
                ->whereNotNull('telegram_username')
                ->cursor() as $account) {
                $username = strtolower(ltrim((string) $account->telegram_username, '@'));
                if (in_array($username, $permanentUsernames, true) && ! $account->is_bot_admin) {
                    $account->update(['is_bot_admin' => true]);
                }
            }
        }
    }
}
