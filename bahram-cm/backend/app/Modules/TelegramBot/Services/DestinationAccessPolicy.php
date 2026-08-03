<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\CourseAccess;
use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\User;
use App\Services\Sat\SatParticipantAccessService;
use App\Modules\TelegramBot\Models\TelegramAccessDenial;
use App\Modules\TelegramBot\Models\TelegramAccessGrant;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationRequirement;

class DestinationAccessPolicy
{
    public const REASON_REFERENCE_IDENTITY_REQUIRED = 'احراز هویت سطح ۲ لازم است تا عضو گروه مرجع شوید.';

    /** @var array<int, bool> */
    private array $identityLevel2Memo = [];

    /** @var array<int, bool> */
    private array $referenceDestinationMemo = [];

    /** @var array<string, bool> */
    private array $productAccessMemo = [];

    /**
     * Destination access for a linked Telegram account (merge-aware).
     *
     * @return array{allowed: bool, reason: string}
     */
    public function evaluateForAccount(TelegramDestination $destination, ?TelegramAccount $account): array
    {
        if ($account === null) {
            return ['allowed' => false, 'reason' => 'ابتدا در ربات ثبت‌نام کنید.'];
        }

        $mergeService = app(DestinationMobileMergeService::class);

        if ($mergeService->isDestinationBlockedForAccount($account)) {
            $merge = $mergeService->approvedByCanonicalMobile((string) $account->mobile);

            return [
                'allowed' => false,
                'reason' => $merge !== null
                    ? $mergeService->blockedMessageForCanonical($merge)
                    : 'خط شما ادغام شده است. با پشتیبانی تماس بگیرید.',
            ];
        }

        $userId = $mergeService->resolveDestinationUserId($account);

        return $this->evaluate($destination, $userId);
    }

    /**
     * @return array{allowed: bool, reason: string}
     */
    public function evaluate(TelegramDestination $destination, ?int $userId): array
    {
        if (! $destination->is_active) {
            return ['allowed' => false, 'reason' => 'مقصد غیرفعال است.'];
        }

        if ($userId === null) {
            return ['allowed' => false, 'reason' => 'ابتدا در ربات ثبت‌نام کنید.'];
        }

        if (TelegramAccessDenial::query()
            ->where('telegram_destination_id', $destination->id)
            ->where('user_id', $userId)
            ->exists()) {
            return ['allowed' => false, 'reason' => 'دسترسی شما به این مقصد مسدود شده است.'];
        }

        // Reference group: L2 always required (even with manual grant).
        if ($this->isReferenceDestination($destination) && ! $this->hasIdentityLevel2($userId)) {
            return [
                'allowed' => false,
                'reason' => self::REASON_REFERENCE_IDENTITY_REQUIRED,
            ];
        }

        if (TelegramAccessGrant::query()
            ->where('telegram_destination_id', $destination->id)
            ->where('user_id', $userId)
            ->where(function ($q): void {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->exists()) {
            return ['allowed' => true, 'reason' => 'manual_grant'];
        }

        $requirements = $this->requirementsFor($destination);

        if ($requirements->isEmpty()) {
            return ['allowed' => false, 'reason' => 'شرایط دسترسی تعریف نشده است.'];
        }

        $byGroup = $requirements->groupBy(fn ($r) => $r->group_key ?: 'default');

        foreach ($byGroup as $group) {
            $operator = (string) ($group->first()->operator ?? 'all');
            $results = $group->map(fn ($req) => $this->matchesRequirement($req, $userId));

            $ok = $operator === 'any'
                ? $results->contains(true)
                : $results->every(fn ($v) => $v === true);

            if (! $ok) {
                return [
                    'allowed' => false,
                    'reason' => $this->unmetRequirementsReason($group, $userId, $operator),
                ];
            }
        }

        return ['allowed' => true, 'reason' => 'requirements_met'];
    }

    public function isReferenceDestination(TelegramDestination $destination): bool
    {
        if (array_key_exists($destination->id, $this->referenceDestinationMemo)) {
            return $this->referenceDestinationMemo[$destination->id];
        }

        $this->referenceDestinationMemo[$destination->id] = ReferenceChannel::query()
            ->where('telegram_destination_id', $destination->id)
            ->exists();

        return $this->referenceDestinationMemo[$destination->id];
    }

    public static function isIdentityRequiredReason(string $reason): bool
    {
        return str_contains($reason, self::REASON_REFERENCE_IDENTITY_REQUIRED)
            || str_contains($reason, 'احراز هویت سطح ۲');
    }

    private function hasIdentityLevel2(int $userId): bool
    {
        if (array_key_exists($userId, $this->identityLevel2Memo)) {
            return $this->identityLevel2Memo[$userId];
        }

        $user = User::query()->with('identityProfile')->find($userId);
        $level = (int) ($user?->identityProfile?->verification_level ?? 0);

        $this->identityLevel2Memo[$userId] = $level >= 2;

        return $this->identityLevel2Memo[$userId];
    }

    /**
     * @return \Illuminate\Support\Collection<int, TelegramDestinationRequirement>
     */
    private function requirementsFor(TelegramDestination $destination): \Illuminate\Support\Collection
    {
        if ($destination->relationLoaded('requirements')) {
            return $destination->requirements;
        }

        return TelegramDestinationRequirement::query()
            ->where('telegram_destination_id', $destination->id)
            ->get();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TelegramDestinationRequirement>  $group
     */
    private function unmetRequirementsReason($group, int $userId, string $operator): string
    {
        $failedLabels = $group
            ->filter(fn (TelegramDestinationRequirement $req) => ! $this->matchesRequirement($req, $userId))
            ->map(fn (TelegramDestinationRequirement $req) => $this->describeUnmetRequirement($req))
            ->filter()
            ->unique()
            ->values();

        if ($failedLabels->isEmpty()) {
            return $this->withJoinHint('شرایط دسترسی برقرار نیست.');
        }

        if ($operator === 'any') {
            $lines = ['برای عضویت در این گروه باید یکی از موارد زیر را داشته باشی:'];
            foreach ($failedLabels as $label) {
                $lines[] = '• '.$label;
            }

            return $this->withJoinHint(implode("\n", $lines));
        }

        if ($failedLabels->count() === 1) {
            return $this->withJoinHint((string) $failedLabels->first());
        }

        return $this->withJoinHint(implode("\n", $failedLabels->all()));
    }

    private function describeUnmetRequirement(TelegramDestinationRequirement $req): string
    {
        return match ($req->requirement_type) {
            'product', 'active_course_access' => $this->describeMissingProduct((int) $req->requirement_value),
            'sat_membership' => 'عضویت سات فعال نداری.',
            default => 'شرایط دسترسی برقرار نیست.',
        };
    }

    private function describeMissingProduct(int $productId): string
    {
        if ($productId <= 0) {
            return 'محصول لازم برای این گروه را نخریدی.';
        }

        $product = Product::query()->find($productId);
        if ($product === null) {
            return 'محصول لازم برای این گروه را نخریدی.';
        }

        $title = trim((string) $product->title);
        if ($title === '') {
            $title = 'مورد نیاز';
        }

        if ($product->isSeminarProduct()) {
            return 'سمینار «'.$title.'» رو نخریدی.';
        }

        if ($product->isReferenceChannelProduct()) {
            return 'دسترسی «'.$title.'» رو نداری.';
        }

        return 'دوره «'.$title.'» فعال رو نخریدی.';
    }

    private function withJoinHint(string $reason): string
    {
        return $reason
            ."\n\n"
            .'از منوی ربات محصول را بخر (یا اگر قبلاً خریدی، با همین اکانت تلگرام ثبت‌نام/وارد شو)، بعد دوباره لینک عضویت را بزن.';
    }

    private function matchesRequirement(TelegramDestinationRequirement $req, int $userId): bool
    {
        return match ($req->requirement_type) {
            'product', 'active_course_access' => $this->matchesProductAccess($userId, (int) $req->requirement_value),
            'sat_membership' => app(SatParticipantAccessService::class)->hasOpenedAccessByUserId($userId),
            'manual_grant' => true,
            default => false,
        };
    }

    private function matchesProductAccess(int $userId, int $productId): bool
    {
        if ($productId <= 0) {
            return false;
        }

        $memoKey = "{$userId}:{$productId}";
        if (array_key_exists($memoKey, $this->productAccessMemo)) {
            return $this->productAccessMemo[$memoKey];
        }

        if (CourseAccess::query()
            ->where('user_id', $userId)
            ->where('product_id', $productId)
            ->where('status', 'active')
            ->exists()) {
            return $this->productAccessMemo[$memoKey] = true;
        }

        $channel = ReferenceChannel::query()->where('product_id', $productId)->first();
        if ($channel === null) {
            $product = Product::query()->find($productId);
            if ($product === null || ! $product->isReferenceChannelProduct()) {
                return $this->productAccessMemo[$memoKey] = false;
            }
            $channel = $product->referenceChannel;
        }

        if ($channel === null) {
            return $this->productAccessMemo[$memoKey] = false;
        }

        return $this->productAccessMemo[$memoKey] = ReferenceChannelEntitlement::query()
            ->where('reference_channel_id', $channel->id)
            ->where('user_id', $userId)
            ->exists();
    }
}
