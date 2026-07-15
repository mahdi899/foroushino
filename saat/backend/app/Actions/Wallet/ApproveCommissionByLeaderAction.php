<?php

namespace App\Actions\Wallet;

use App\Enums\CommissionStatus;
use App\Enums\NotificationKind;
use App\Enums\RoleName;
use App\Models\Commission;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ApproveCommissionByLeaderAction
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function execute(Commission $commission, User $leader): Commission
    {
        if (! $leader->hasRole(RoleName::Leader->value)) {
            throw new RuntimeException('فقط لیدر تیم می‌تواند پورسانت را تایید کند.');
        }

        if ($commission->status !== CommissionStatus::Pending) {
            throw new RuntimeException('این پورسانت در انتظار تایید لیدر نیست.');
        }

        $agentTeamId = $commission->agent?->team_id;
        $leaderTeam = $leader->team_id;
        if (! $agentTeamId || (int) $agentTeamId !== (int) $leaderTeam) {
            throw new RuntimeException('این پورسانت مربوط به تیم شما نیست.');
        }

        return DB::transaction(function () use ($commission, $leader) {
            $commission->status = CommissionStatus::Approved;
            $commission->leader_approved_by = $leader->id;
            $commission->leader_approved_at = now();
            $commission->save();

            User::query()
                ->role(RoleName::Supervisor->value)
                ->where('is_active', true)
                ->each(fn (User $supervisor) => $this->notifications->notify(
                    $supervisor,
                    NotificationKind::Commission,
                    'پورسانت منتظر تایید ناظر',
                    "پورسانت {$commission->agent?->name} توسط لیدر تایید شد.",
                    '/wallet/approvals',
                ));

            $this->notifications->notify(
                $commission->agent,
                NotificationKind::Commission,
                'پورسانت توسط لیدر تایید شد',
                'در انتظار تایید ناظر برای واریز به کیف پول.',
                '/wallet',
            );

            return $commission->fresh(['product', 'lead', 'agent']);
        });
    }
}
