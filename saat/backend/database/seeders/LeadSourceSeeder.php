<?php

namespace Database\Seeders;

use App\Models\LeadSourceCatalog;
use Illuminate\Database\Seeder;

class LeadSourceSeeder extends Seeder
{
    public function run(): void
    {
        $sources = [
            ['slug' => 'instagram', 'label' => 'اینستاگرام', 'sort_order' => 10, 'is_system' => true],
            ['slug' => 'website', 'label' => 'سایت', 'sort_order' => 20, 'is_system' => true],
            ['slug' => 'telegram', 'label' => 'تلگرام', 'sort_order' => 30, 'is_system' => true],
            ['slug' => 'ads', 'label' => 'تبلیغات', 'sort_order' => 40, 'is_system' => true],
            ['slug' => 'webinar', 'label' => 'وبینار', 'sort_order' => 50, 'is_system' => true],
            ['slug' => 'form', 'label' => 'فرم ثبت‌نام', 'sort_order' => 60, 'is_system' => true],
            ['slug' => 'excel', 'label' => 'اکسل وارد شده', 'sort_order' => 70, 'is_system' => true],
            ['slug' => 'bahram', 'label' => 'بهرام', 'sort_order' => 90, 'is_system' => true, 'show_in_form' => false],
        ];

        foreach ($sources as $source) {
            LeadSourceCatalog::query()->updateOrCreate(
                ['slug' => $source['slug']],
                [
                    'label' => $source['label'],
                    'sort_order' => $source['sort_order'],
                    'is_active' => true,
                    'is_system' => $source['is_system'],
                    'show_in_form' => $source['show_in_form'] ?? true,
                ],
            );
        }
    }
}
