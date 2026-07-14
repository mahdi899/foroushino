<?php

namespace App\Actions\Wallet;

use App\Enums\NotificationKind;
use App\Enums\RoleName;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Auth\Access\AuthorizationException;
use RuntimeException;

class ConfirmBankAccountAction
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function execute(User $agent, User $supervisor): User
    {
        if (! $agent->hasRole(RoleName::Agent->value)) {
            throw new RuntimeException('فقط اطلاعات بانکی کارشناس قابل تایید است.');
        }
        $this->assertCanReview($agent, $supervisor);

        if (! $agent->bank_card) {
            throw new RuntimeException('کارشناس هنوز شماره کارت ثبت نکرده است.');
        }

        if (! $agent->bank_sheba) {
            throw new RuntimeException('کارشناس هنوز شماره شبا ثبت نکرده است.');
        }

        if ($agent->bank_card_confirmed_at !== null) {
            throw new RuntimeException('اطلاعات بانکی این کارشناس قبلاً تایید شده است.');
        }

        $agent->bank_card_confirmed_at = now();
        $agent->save();

        $this->notifications->notify(
            $agent,
            NotificationKind::Payout,
            'اطلاعات بانکی تایید شد',
            'ناظر کارت و شبای شما را تایید کرد. اکنون می‌توانی درخواست تسویه ثبت کنی.',
            '/wallet',
        );

        return $agent->fresh('team');
    }

    private function assertCanReview(User $agent, User $supervisor): void
    {
        if (! $supervisor->can('users.manage-team') && ! $supervisor->can('users.manage')) {
            throw new AuthorizationException('اجازه تایید اطلاعات بانکی ندارید.');
        }

        if ($supervisor->can('users.manage') || $supervisor->can('reports.view-all')) {
            return;
        }

        if (! $supervisor->team_id || (int) $supervisor->team_id !== (int) $agent->team_id) {
            throw new AuthorizationException('فقط کارشناسان تیم خودت را می‌توانی تایید کنی.');
        }
    }
}
