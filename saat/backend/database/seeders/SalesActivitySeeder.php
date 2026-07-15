<?php

namespace Database\Seeders;

use App\Models\Lead;
use App\Models\Product;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Generates a realistic slice of historical calls/sales/commissions/wallet
 * activity so reports, wallet screens, and leaderboards aren't empty on a
 * freshly seeded system.
 */
class SalesActivitySeeder extends Seeder
{
    private const SALE_COUNT = 600;

    public function run(): void
    {
        $leads = Lead::query()
            ->whereNotNull('assigned_agent_id')
            ->inRandomOrder()
            ->limit(self::SALE_COUNT)
            ->get(['id', 'assigned_agent_id', 'assigned_team_id', 'product_id']);

        if ($leads->isEmpty()) {
            $this->command?->warn('Skipping sales activity seeding: no assigned leads found.');

            return;
        }

        $products = Product::all()->keyBy('id');
        $now = now();
        $callRows = [];
        $saleRows = [];
        $leadUpdates = [];

        foreach ($leads as $i => $lead) {
            $roll = mt_rand(1, 100);
            $status = match (true) {
                $roll <= 58 => 'confirmed',
                $roll <= 75 => 'pending_confirmation',
                $roll <= 92 => 'payment_pending',
                default => 'rejected',
            };

            $product = $products->get($lead->product_id) ?? $products->first();
            $amount = (float) $product->price + mt_rand(-200000, 200000);
            $createdAt = $now->copy()->subDays(mt_rand(0, 45));
            $result = in_array($status, ['confirmed', 'pending_confirmation'], true) ? 'registered' : 'payment_pending';

            $callRows[] = [
                'lead_id' => $lead->id,
                'agent_id' => $lead->assigned_agent_id,
                'result' => $result,
                'note' => 'مشتری ثبت‌نام کرد.',
                'duration_sec' => mt_rand(120, 600),
                'started_at' => $createdAt,
                'ended_at' => $createdAt->copy()->addMinutes(mt_rand(2, 10)),
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $saleRows[] = [
                '_lead_id' => $lead->id,
                'lead_id' => $lead->id,
                'agent_id' => $lead->assigned_agent_id,
                'team_id' => $lead->assigned_team_id,
                'product_id' => $product->id,
                'amount' => max($amount, 500000),
                'status' => $status,
                'payment_method' => $status === 'payment_pending' ? null : ($product->id % 2 === 0 ? 'gateway' : 'card'),
                'submitted_at' => $status === 'payment_pending' ? null : $createdAt->copy()->addHours(1),
                'confirmed_at' => $status === 'confirmed' ? $createdAt->copy()->addHours(2) : null,
                'rejected_at' => $status === 'rejected' ? $createdAt->copy()->addHours(2) : null,
                'rejection_reason' => $status === 'rejected' ? 'انصراف مشتری بعد از ثبت اولیه' : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $leadStatus = match ($status) {
                'confirmed' => 'won',
                'pending_confirmation' => 'sale_pending_confirmation',
                'payment_pending' => 'payment_pending',
                default => 'follow_up_required',
            };
            $leadStage = $status === 'confirmed' ? 'won' : ($status === 'rejected' ? 'follow_up' : 'payment_pending');

            $leadUpdates[$lead->id] = ['status' => $leadStatus, 'stage' => $leadStage];
        }

        DB::table('calls')->insert($callRows);

        foreach (array_chunk($saleRows, 200) as $chunk) {
            $clean = array_map(fn ($row) => collect($row)->except('_lead_id')->all(), $chunk);
            DB::table('sales')->insert($clean);
        }

        foreach ($leadUpdates as $leadId => $update) {
            Lead::query()->whereKey($leadId)->update($update);
        }

        $this->seedCommissionsAndWallets();
    }

    private function seedCommissionsAndWallets(): void
    {
        $confirmedSales = DB::table('sales')->where('status', 'confirmed')->get();
        $products = Product::all()->keyBy('id');
        $now = now();

        $walletDeltas = [];
        $commissionRows = [];
        $walletTxRows = [];

        foreach ($confirmedSales as $sale) {
            $product = $products->get($sale->product_id);
            $rate = (float) ($product?->commission_rate ?? 12);
            $commissionAmount = round(((float) $sale->amount * $rate) / 100, 2);

            $availableRoll = mt_rand(1, 100);
            $commissionStatus = $availableRoll <= 60 ? 'available' : ($availableRoll <= 90 ? 'pending' : 'approved');

            $commissionRows[] = [
                'sale_id' => $sale->id,
                'agent_id' => $sale->agent_id,
                'product_id' => $sale->product_id,
                'lead_id' => $sale->lead_id,
                'sale_amount' => $sale->amount,
                'commission_rate' => $rate,
                'commission_amount' => $commissionAmount,
                'status' => $commissionStatus,
                'available_at' => $now->copy()->addDays(3),
                'approved_at' => $commissionStatus !== 'pending' ? $now->copy()->subDays(mt_rand(0, 10)) : null,
                'created_at' => $sale->created_at,
                'updated_at' => $now,
            ];

            $agentId = $sale->agent_id;
            $walletDeltas[$agentId] ??= ['pending' => 0, 'available' => 0, 'earned' => 0];

            if ($commissionStatus === 'available') {
                $walletDeltas[$agentId]['available'] += $commissionAmount;
                $walletDeltas[$agentId]['earned'] += $commissionAmount;
                $walletTxRows[] = $this->walletTx($agentId, 'commission_available', $commissionAmount, 'پورسانت قابل برداشت', $sale->created_at);
            }
        }

        foreach (array_chunk($commissionRows, 200) as $chunk) {
            DB::table('commissions')->insert($chunk);
        }
        foreach (array_chunk($walletTxRows, 200) as $chunk) {
            DB::table('wallet_transactions')->insert($chunk);
        }

        foreach ($walletDeltas as $agentId => $delta) {
            $wallet = Wallet::query()->firstOrCreate(['user_id' => $agentId]);
            $wallet->balance_pending += $delta['pending'];
            $wallet->balance_available += $delta['available'];
            $wallet->total_earned += $delta['earned'];
            $wallet->save();
        }
    }

    private function walletTx(int $agentId, string $type, float $amount, string $description, $createdAt): array
    {
        return [
            'user_id' => $agentId,
            'type' => $type,
            'amount' => $amount,
            'description' => $description,
            'reference_type' => 'commission',
            'reference_id' => null,
            'created_at' => $createdAt,
        ];
    }
}
