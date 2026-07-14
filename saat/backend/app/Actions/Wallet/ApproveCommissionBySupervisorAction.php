<?php

namespace App\Actions\Wallet;

use App\Enums\CommissionStatus;
use App\Enums\NotificationKind;
use App\Enums\RoleName;
use App\Models\Commission;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WalletService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ApproveCommissionBySupervisorAction
{
    public function __construct(
        private readonly WalletService $wallet,
        private readonly NotificationService $notifications,
    ) {}

    public function execute(Commission $commission, User $supervisor): Commission
    {
        if (! $supervisor->hasAnyRole([RoleName::Supervisor->value, RoleName::Manager->value, RoleName::Admin->value])) {
            throw new RuntimeException('فقط ناظر یا مدیر می‌تواند پورسانت را نهایی کند.');
        }

        if ($commission->status !== CommissionStatus::Approved) {
            throw new RuntimeException('این پورسانت هنوز توسط لیدر تایید نشده است.');
        }

        return DB::transaction(function () use ($commission, $supervisor) {
            $this->wallet->creditAvailable($commission);

            $commission->approved_at = now();
            $commission->save();

            $this->notifications->notify(
                $commission->agent,
                NotificationKind::Commission,
                'پورسانت به کیف پول اضافه شد',
                'می‌توانی درخواست تسویه ثبت کنی.',
                '/wallet',
            );

            return $commission->fresh(['product', 'lead', 'agent']);
        });
    }
}
