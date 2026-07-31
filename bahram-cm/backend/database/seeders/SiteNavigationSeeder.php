<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SiteNavigationSeeder extends Seeder
{
    /**
     * Default main navigation — mirrors bahram-cm/frontend/content/site.ts `site.nav`.
     *
     * @return list<array{href: string, label: string, shortLabel?: string, order: int}>
     */
    public static function defaultItems(): array
    {
        return [
            ['href' => '/course/campaign-writing', 'label' => 'کمپین‌نویسی', 'shortLabel' => 'کمپین', 'order' => 1],
            ['href' => '/reference-channels/kanal-mrgf', 'label' => 'کانال مرجع', 'shortLabel' => 'مرجع', 'order' => 2],
            ['href' => '/saat', 'label' => 'سات', 'order' => 3],
            ['href' => '/courses', 'label' => 'دوره‌ها', 'shortLabel' => 'دوره', 'order' => 4],
            ['href' => '/seminars/smynar-zaafranyh-thran', 'label' => 'سمینار', 'order' => 5],
            ['href' => '/transformations', 'label' => 'رضایت دانشجوها', 'shortLabel' => 'رضایت', 'order' => 6],
            ['href' => '/insights', 'label' => 'بلاگ', 'order' => 7],
            ['href' => '/founder', 'label' => 'درباره‌ی بهرام', 'shortLabel' => 'بهرام', 'order' => 8],
            ['href' => '/contact', 'label' => 'تماس با ما', 'shortLabel' => 'تماس', 'order' => 9],
        ];
    }

    public function run(): void
    {
        $exists = Setting::query()
            ->where('group', 'content')
            ->where('key', 'navigation')
            ->exists();

        if ($exists) {
            return;
        }

        Setting::query()->create([
            'group' => 'content',
            'key' => 'navigation',
            'value' => self::defaultItems(),
        ]);
    }
}
