<?php

namespace App\Actions\Wallet;

use App\Enums\NotificationKind;
use App\Enums\RoleName;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Auth\Access\AuthorizationException;
use RuntimeException;

class ClearBankAccountAction
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function execute(User $agent, User $supervisor): User
    {
        if (! $agent->hasRole(RoleName::Agent->value)) {
            throw new RuntimeException('فقط اطلاعات بانکی کارشناس قابل حذف است.');
        }

        $this->assertCanReview($agent, $supervisor);

        if (! $agent->bank_card && ! $agent->bank_sheba) {
            throw new RuntimeException('این کارشناس اطلاعات بانکی ثبت‌شده‌ای ندارد.');
        }

        $agent->bank_card = null;
        $agent->bank_sheba = null;
        $agent->bank_card_confirmed_at = null;
        $agent->save();

        $this->notifications->notify(
            $agent,
            NotificationKind::Payout,
            'اطلاعات بانکی حذف شد',
            'ناظر کارت و شبای شما را حذف کرد. برای درخواست تسویه، دوباره اطلاعات بانکی را ثبت کن.',
            '/wallet',
        );

        return $agent->fresh('team');
    }

    private function assertCanReview(User $agent, User $supervisor): void
    {
        if (! $supervisor->can('users.manage-team') && ! $supervisor->can('users.manage')) {
            throw new AuthorizationException('اجازه حذف اطلاعات بانکی ندارید.');
        }

        if ($supervisor->can('users.manage') || $supervisor->can('reports.view-all')) {
            return;
        }

        if (! $supervisor->team_id || (int) $supervisor->team_id !== (int) $agent->team_id) {
            throw new AuthorizationException('فقط اطلاعات بانکی کارشناسان تیم خودت را می‌توانی حذف کنی.');
        }
    }
}
