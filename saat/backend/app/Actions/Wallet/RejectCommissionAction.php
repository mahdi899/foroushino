<?php

namespace App\Actions\Wallet;

use App\Enums\CommissionStatus;
use App\Enums\NotificationKind;
use App\Models\Commission;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class RejectCommissionAction
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function execute(Commission $commission, User $actor, string $reason): Commission
    {
        if (! in_array($commission->status, [CommissionStatus::Pending, CommissionStatus::Approved], true)) {
            throw new RuntimeException('این پورسانت قابل رد نیست.');
        }

        return DB::transaction(function () use ($commission, $actor, $reason) {
            $commission->status = CommissionStatus::Rejected;
            $commission->rejection_reason = $reason;
            $commission->save();

            $this->notifications->notify(
                $commission->agent,
                NotificationKind::Commission,
                'پورسانت رد شد',
                $reason,
                '/wallet',
            );

            return $commission->fresh(['product', 'lead', 'agent']);
        });
    }
}
