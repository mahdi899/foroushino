<?php

namespace App\Services;

use App\Enums\CourseAccessStatus;
use App\Enums\ProductType;
use App\Models\CourseAccess;
use App\Models\MiniCourse;
use App\Models\MiniCourseEnrollment;
use App\Models\Order;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Support\Mobile;

/**
 * Canonical owned-product list for Iran → host snapshot/push.
 * Mirrors {@see PurchaseGuardService::ownsProduct()} sources without per-product N+1.
 */
class TelegramHostOwnershipResolver
{
    /** @return list<int> */
    public function ownedProductIdsForAccount(TelegramAccount $account): array
    {
        $account->loadMissing('user');

        return $this->ownedProductIdsForUser($account->user, $account->mobile);
    }

    /** @return list<int> */
    public function ownedProductIdsForUser(?User $user, ?string $mobile = null): array
    {
        $userId = $user && ! $user->is_admin ? (int) $user->id : null;
        $phone = $this->normalizePhone($mobile, $user);
        $userIds = $this->resolveUserIds($userId, $phone);

        if ($userIds === [] && $phone === null) {
            return [];
        }

        $ids = [];

        $ids = array_merge($ids, $this->productIdsFromPaidOrders($userId, $phone));

        if ($userIds !== []) {
            $ids = array_merge($ids, $this->productIdsFromCourseAccess($userIds));
            $ids = array_merge($ids, $this->productIdsFromReferenceEntitlements($userIds));
            $ids = array_merge($ids, $this->productIdsFromSeminarAttendees($userIds));
            $ids = array_merge($ids, $this->productIdsFromMiniCourseEnrollments($userIds));
        }

        return array_values(array_unique(array_filter(array_map('intval', $ids))));
    }

    /** @return list<int> */
    private function productIdsFromPaidOrders(?int $userId, ?string $phone): array
    {
        return Order::query()
            ->whereIn('status', ['paid', 'fulfilled'])
            ->where(function ($query) use ($userId, $phone) {
                if ($userId && $phone) {
                    $query->where('user_id', $userId)->orWhere('customer_phone', $phone);

                    return;
                }

                if ($userId) {
                    $query->where('user_id', $userId);

                    return;
                }

                if ($phone) {
                    $query->where('customer_phone', $phone);

                    return;
                }

                $query->whereRaw('0 = 1');
            })
            ->pluck('product_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  list<int>  $userIds
     * @return list<int>
     */
    private function productIdsFromCourseAccess(array $userIds): array
    {
        return CourseAccess::query()
            ->whereIn('user_id', $userIds)
            ->where('status', CourseAccessStatus::Active)
            ->pluck('product_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  list<int>  $userIds
     * @return list<int>
     */
    private function productIdsFromReferenceEntitlements(array $userIds): array
    {
        $channelIds = ReferenceChannelEntitlement::query()
            ->whereIn('user_id', $userIds)
            ->pluck('reference_channel_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($channelIds === []) {
            return [];
        }

        return ReferenceChannel::query()
            ->whereIn('id', $channelIds)
            ->pluck('product_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  list<int>  $userIds
     * @return list<int>
     */
    private function productIdsFromSeminarAttendees(array $userIds): array
    {
        $seminarIds = SeminarAttendee::query()
            ->whereIn('user_id', $userIds)
            ->where('attendance_status', '!=', 'absent')
            ->pluck('seminar_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($seminarIds === []) {
            return [];
        }

        return Seminar::query()
            ->whereIn('id', $seminarIds)
            ->pluck('product_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  list<int>  $userIds
     * @return list<int>
     */
    private function productIdsFromMiniCourseEnrollments(array $userIds): array
    {
        $miniCourseIds = MiniCourseEnrollment::query()
            ->whereIn('user_id', $userIds)
            ->pluck('mini_course_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($miniCourseIds === []) {
            return [];
        }

        return MiniCourse::query()
            ->whereIn('id', $miniCourseIds)
            ->whereHas('product', fn ($q) => $q->where('type', ProductType::MiniCourse->value))
            ->pluck('product_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /** @return list<int> */
    private function resolveUserIds(?int $userId, ?string $phone): array
    {
        $ids = array_filter([
            $userId,
            $phone ? User::query()->where('mobile', $phone)->value('id') : null,
        ]);

        return array_values(array_unique(array_map('intval', $ids)));
    }

    private function normalizePhone(?string $mobile, ?User $user): ?string
    {
        $raw = trim((string) ($mobile ?? $user?->mobile ?? ''));

        return $raw !== '' ? Mobile::normalize($raw) : null;
    }
}
