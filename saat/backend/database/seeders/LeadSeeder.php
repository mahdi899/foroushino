<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LeadSeeder extends Seeder
{
    private const TOTAL = 10_000;

    private const CHUNK = 500;

    private const CITIES = [
        'تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'قم', 'اهواز',
        'کرمانشاه', 'رشت', 'یزد', 'اردبیل', 'همدان', 'ساری', 'بندرعباس',
    ];

    private const SOURCES = ['instagram', 'website', 'telegram', 'ads', 'webinar', 'form', 'excel'];

    public function run(): void
    {
        $agents = User::query()->role('agent')->select(['id', 'team_id'])->get();
        $agentCount = $agents->count();
        $products = Product::all();

        if ($agentCount === 0 || $products->isEmpty()) {
            $this->command?->warn('Skipping lead seeding: no agents/products found. Run UserSeeder/ProductSeeder first.');

            return;
        }

        $faker = fake('fa_IR');
        $this->command?->getOutput()->writeln('Seeding '.self::TOTAL.' leads...');

        $created = 0;
        $usedPhones = [];

        while ($created < self::TOTAL) {
            $batchSize = min(self::CHUNK, self::TOTAL - $created);
            $rows = [];

            for ($i = 0; $i < $batchSize; $i++) {
                $temperatureRoll = mt_rand(1, 100);
                $temperature = $temperatureRoll <= 15 ? 'hot' : ($temperatureRoll <= 60 ? 'warm' : 'cold');

                // ~55% of leads are already assigned/in-progress; the rest sit unassigned in the pool.
                $isAssigned = mt_rand(1, 100) <= 55;
                $agent = $isAssigned ? $agents->random() : null;

                $callCount = $isAssigned ? mt_rand(0, 6) : 0;
                $probability = match ($temperature) {
                    'hot' => mt_rand(55, 95),
                    'warm' => mt_rand(30, 70),
                    default => mt_rand(0, 35),
                };

                $status = 'new';
                $stage = 'new';
                $nextFollowupAt = null;
                $doNotCallAt = null;

                if ($isAssigned) {
                    $roll = mt_rand(1, 100);
                    if ($roll <= 20) {
                        $status = 'queued';
                        $stage = 'first_call';
                    } elseif ($roll <= 45) {
                        $status = 'contacted';
                        $stage = 'first_call';
                    } elseif ($roll <= 65) {
                        $status = 'follow_up_required';
                        $stage = 'follow_up';
                        $nextFollowupAt = mt_rand(0, 1)
                            ? now()->addHours(mt_rand(1, 72))
                            : now()->subHours(mt_rand(1, 48)); // some overdue on purpose
                    } elseif ($roll <= 75) {
                        $status = 'no_answer';
                        $stage = 'first_call';
                    } elseif ($roll <= 85) {
                        $status = 'consultation_scheduled';
                        $stage = 'meeting';
                        $nextFollowupAt = now()->addDays(mt_rand(1, 5));
                    } elseif ($roll <= 92) {
                        $status = 'lost';
                        $stage = 'lost';
                    } elseif ($roll <= 97) {
                        $status = 'do_not_call';
                        $stage = 'lost';
                        $doNotCallAt = now()->subDays(mt_rand(1, 30));
                    } else {
                        $status = 'wrong_number';
                        $stage = 'lost';
                    }
                }

                do {
                    $phone = '09'.mt_rand(10, 39).mt_rand(1000000, 9999999);
                } while (isset($usedPhones[$phone]));
                $usedPhones[$phone] = true;

                $product = $products->random();

                $rows[] = [
                    'first_name' => $faker->firstName(),
                    'last_name' => $faker->lastName(),
                    'phone' => $phone,
                    'normalized_phone' => $phone,
                    'city' => self::CITIES[array_rand(self::CITIES)],
                    'source' => self::SOURCES[array_rand(self::SOURCES)],
                    'temperature' => $temperature,
                    'priority' => mt_rand(1, 3),
                    'stage' => $stage,
                    'status' => $status,
                    'product_id' => $product->id,
                    'campaign_id' => null,
                    'budget' => $faker->randomElement(['کم', 'متوسط', 'بالا', null]),
                    'job' => $faker->jobTitle(),
                    'experience' => $faker->randomElement(['none', 'beginner', 'intermediate', 'advanced']),
                    'income_goal' => $faker->randomElement(['۵ میلیون', '۱۰ میلیون', '۲۰ میلیون', null]),
                    'interest_reason' => $faker->randomElement([
                        'دنبال شغل دورکاری هست', 'می‌خواد درآمد جانبی داشته باشه', 'تغییر مسیر شغلی می‌خواد', null,
                    ]),
                    'best_call_time' => $faker->randomElement(['صبح', 'ظهر', 'عصر', 'شب', null]),
                    'last_call_at' => $callCount > 0 ? now()->subHours(mt_rand(1, 240)) : null,
                    'call_count' => $callCount,
                    'last_note' => $callCount > 0 ? 'مشتری درخواست اطلاعات بیشتر کرد.' : null,
                    'conversion_probability' => $probability,
                    'pain_point' => $faker->randomElement(['نبود درآمد کافی', 'نارضایتی شغلی', 'بیکاری', null]),
                    'objection' => null,
                    'next_followup_at' => $nextFollowupAt,
                    'rating' => $callCount > 0 ? mt_rand(1, 5) : null,
                    'assigned_agent_id' => $agent?->id,
                    'assigned_team_id' => $agent?->team_id,
                    'locked_by' => null,
                    'locked_until' => null,
                    'returned_to_pool' => false,
                    'do_not_call_at' => $doNotCallAt,
                    'duplicate_of_id' => null,
                    'metadata' => null,
                    'created_at' => now()->subDays(mt_rand(0, 60)),
                    'updated_at' => now(),
                ];
            }

            DB::table('leads')->insert($rows);
            $created += $batchSize;
        }

        $this->seedDuplicates();
    }

    /**
     * Sprinkle in a handful of intentional phone duplicates for duplicate-detection tests/demo.
     */
    private function seedDuplicates(): void
    {
        $originals = DB::table('leads')->inRandomOrder()->limit(20)->get(['id', 'phone', 'first_name', 'last_name', 'product_id']);

        foreach ($originals as $original) {
            DB::table('leads')->insert([
                'first_name' => $original->first_name,
                'last_name' => $original->last_name,
                'phone' => $original->phone,
                'normalized_phone' => $original->phone,
                'city' => 'تهران',
                'source' => 'excel',
                'temperature' => 'cold',
                'priority' => 1,
                'stage' => 'new',
                'status' => 'duplicate',
                'product_id' => $original->product_id,
                'duplicate_of_id' => $original->id,
                'call_count' => 0,
                'conversion_probability' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
