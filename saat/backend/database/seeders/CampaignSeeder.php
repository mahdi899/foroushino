<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Product;
use Illuminate\Database\Seeder;

class CampaignSeeder extends Seeder
{
    public function run(): void
    {
        $sources = ['instagram', 'website', 'telegram', 'ads', 'webinar', 'form', 'excel'];
        $products = Product::all();

        foreach ($products as $product) {
            foreach (array_slice($sources, 0, 3) as $i => $source) {
                Campaign::query()->firstOrCreate([
                    'name' => "کمپین {$product->name} - ".($i + 1),
                    'product_id' => $product->id,
                ], [
                    'source' => $source,
                    'starts_at' => now()->subMonths(2),
                    'ends_at' => now()->addMonths(1),
                    'is_active' => true,
                ]);
            }
        }
    }
}
