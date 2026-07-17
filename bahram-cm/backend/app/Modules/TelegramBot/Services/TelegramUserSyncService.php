<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\CourseAccessStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;

class TelegramUserSyncService
{
    /**
     * Resolve/create the site user for a verified Telegram account and return a sync summary.
     *
     * @return array{user: User, created: bool, lines: list<string>}
     */
    public function syncAfterMobileVerification(TelegramAccount $account): array
    {
        $mobile = (string) $account->mobile;
        $existing = User::query()->where('mobile', $mobile)->first();
        $created = $existing === null;

        $user = $existing ?? User::query()->create([
            'name' => $account->display_name ?: 'کاربر تلگرام',
            'mobile' => $mobile,
            'mobile_verified_at' => now(),
        ]);

        if (! $created) {
            $updates = [];
            if ($user->mobile_verified_at === null) {
                $updates['mobile_verified_at'] = now();
            }
            if (blank($user->name) && filled($account->display_name)) {
                $updates['name'] = $account->display_name;
            }
            if ($updates !== []) {
                $user->update($updates);
            }

            // Prefer the site display name when the user already exists.
            if (filled($user->name) && $account->display_name !== $user->name) {
                $account->update(['display_name' => $user->name]);
            }
        }

        $courses = CourseAccess::query()
            ->with('product:id,title')
            ->where('user_id', $user->id)
            ->where('status', CourseAccessStatus::Active)
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        $paidOrders = Order::query()
            ->where(function ($q) use ($user, $mobile): void {
                $q->where('user_id', $user->id)->orWhere('customer_phone', $mobile);
            })
            ->whereIn('status', ['paid', 'fulfilled'])
            ->count();

        $lines = [];
        $lines[] = $created
            ? 'حساب کاربری جدید در سایت برای شما ساخته شد.'
            : 'حساب قبلی شما در سایت پیدا و به تلگرام متصل شد.';

        if ($paidOrders > 0) {
            $lines[] = 'سفارش‌های موفق ثبت‌شده: '.$paidOrders;
        }

        if ($courses->isNotEmpty()) {
            $lines[] = 'دوره‌های فعال شما:';
            foreach ($courses as $access) {
                $title = $access->product?->title ?? ('محصول #'.$access->product_id);
                $lines[] = '• '.$title;
            }
        } else {
            $lines[] = 'هنوز دوره فعالی روی این شماره ثبت نشده است.';
        }

        return [
            'user' => $user->fresh(),
            'created' => $created,
            'lines' => $lines,
        ];
    }
}
