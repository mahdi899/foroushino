<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestinationMobileMerge;
use App\Services\TelegramHostAccountSnapshotService;
use App\Services\TelegramHostAccountSync;
use App\Services\TelegramHostPushService;
use App\Support\Mobile;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DestinationMobileMergeService
{
    public function __construct(
        private readonly TelegramHostAccountSnapshotService $snapshots,
        private readonly TelegramHostAccountSync $hostSync,
        private readonly TelegramHostPushService $hostPush,
    ) {}

  /**
   * @return array{role: string, partner_mobile: string}|null
   */
    public function mergeMetaForAccount(TelegramAccount $account): ?array
    {
        $mobile = Mobile::normalize((string) ($account->mobile ?? ''));
        if ($mobile === null) {
            return null;
        }

        $asTelegram = $this->approvedByTelegramMobile($mobile);
        if ($asTelegram !== null) {
            return [
                'role' => 'active',
                'partner_mobile' => $asTelegram->canonical_mobile,
            ];
        }

        $asCanonical = $this->approvedByCanonicalMobile($mobile);
        if ($asCanonical !== null) {
            return [
                'role' => 'blocked',
                'partner_mobile' => $asCanonical->telegram_mobile,
            ];
        }

        return null;
    }

    public function approvedByCanonicalMobile(string $mobile): ?TelegramDestinationMobileMerge
    {
        $mobile = Mobile::normalize($mobile);
        if ($mobile === null) {
            return null;
        }

        return TelegramDestinationMobileMerge::query()
            ->where('canonical_mobile', $mobile)
            ->where('status', TelegramDestinationMobileMerge::STATUS_APPROVED)
            ->first();
    }

    public function approvedByTelegramMobile(string $mobile): ?TelegramDestinationMobileMerge
    {
        $mobile = Mobile::normalize($mobile);
        if ($mobile === null) {
            return null;
        }

        return TelegramDestinationMobileMerge::query()
            ->where('telegram_mobile', $mobile)
            ->where('status', TelegramDestinationMobileMerge::STATUS_APPROVED)
            ->first();
    }

    public function blockedMessageForCanonical(TelegramDestinationMobileMerge $merge): string
    {
        $partner = $this->maskMobile($merge->telegram_mobile);

        return "خط شما با شماره {$partner} ادغام شده است. "
            .'برای کانال‌های پشتیبانی از همان شماره در تلگرام استفاده کنید. '
            .'در صورت مشکل با پشتیبانی تماس بگیرید.';
    }

    /**
     * Resolve effective user_id for destination access checks.
     */
    public function resolveDestinationUserId(TelegramAccount $account): ?int
    {
        $mobile = Mobile::normalize((string) ($account->mobile ?? ''));
        if ($mobile === null) {
            return $account->user_id ? (int) $account->user_id : null;
        }

        $merge = $this->approvedByTelegramMobile($mobile);
        if ($merge !== null) {
            return (int) $merge->canonical_user_id;
        }

        if ($this->approvedByCanonicalMobile($mobile) !== null) {
            return null;
        }

        return $account->user_id ? (int) $account->user_id : null;
    }

    public function isDestinationBlockedForAccount(TelegramAccount $account): bool
    {
        $mobile = Mobile::normalize((string) ($account->mobile ?? ''));
        if ($mobile === null) {
            return false;
        }

        return $this->approvedByCanonicalMobile($mobile) !== null;
    }

    public function propose(
        string $canonicalMobileRaw,
        string $telegramMobileRaw,
        ?string $note,
        ?int $actorUserId = null,
    ): TelegramDestinationMobileMerge {
        $canonicalMobile = Mobile::normalize($canonicalMobileRaw);
        $telegramMobile = Mobile::normalize($telegramMobileRaw);

        if ($canonicalMobile === null || $telegramMobile === null) {
            throw new RuntimeException('شماره پایه یا شماره تلگرام نامعتبر است.');
        }

        if ($canonicalMobile === $telegramMobile) {
            throw new RuntimeException('شماره پایه و شماره تلگرام یکسان هستند — ادغام لازم نیست.');
        }

        $canonicalUser = User::query()->where('mobile', $canonicalMobile)->first();
        if ($canonicalUser === null) {
            throw new RuntimeException('کاربر سایت با شماره پایه یافت نشد.');
        }

        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            throw new RuntimeException('ربات production پیکربندی نشده.');
        }

        $telegramAccount = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('mobile', $telegramMobile)
            ->whereNotNull('mobile_verified_at')
            ->orderByDesc('updated_at')
            ->first();

        if ($telegramAccount === null) {
            throw new RuntimeException('اکانت تلگرام با شماره فعال یافت نشد (ثبت‌نام کامل لازم است).');
        }

        $existingCanonical = $this->approvedByCanonicalMobile($canonicalMobile);
        if ($existingCanonical !== null) {
            throw new RuntimeException('این شماره پایه قبلاً ادغام تأییدشده دارد.');
        }

        $existingTelegram = $this->approvedByTelegramMobile($telegramMobile);
        if ($existingTelegram !== null) {
            throw new RuntimeException('این شماره تلگرام قبلاً در ادغام دیگری فعال است.');
        }

        return TelegramDestinationMobileMerge::query()->create([
            'canonical_mobile' => $canonicalMobile,
            'telegram_mobile' => $telegramMobile,
            'canonical_user_id' => $canonicalUser->id,
            'telegram_account_id' => $telegramAccount->id,
            'status' => TelegramDestinationMobileMerge::STATUS_PENDING,
            'note' => filled($note) ? trim($note) : null,
        ]);
    }

    public function approve(TelegramDestinationMobileMerge $merge, ?int $approvedByUserId = null): TelegramDestinationMobileMerge
    {
        if (! $merge->isPending()) {
            throw new RuntimeException('فقط درخواست‌های در انتظار قابل تأیید هستند.');
        }

        return DB::transaction(function () use ($merge, $approvedByUserId): TelegramDestinationMobileMerge {
            $merge->update([
                'status' => TelegramDestinationMobileMerge::STATUS_APPROVED,
                'approved_by' => $approvedByUserId,
                'approved_at' => now(),
                'revoked_by' => null,
                'revoked_at' => null,
            ]);

            $fresh = $merge->fresh(['telegramAccount', 'canonicalUser']);
            $this->pushHostForMerge($fresh);

            return $fresh;
        });
    }

    public function reject(TelegramDestinationMobileMerge $merge): TelegramDestinationMobileMerge
    {
        if (! $merge->isPending()) {
            throw new RuntimeException('فقط درخواست‌های در انتظار قابل رد هستند.');
        }

        $merge->update([
            'status' => TelegramDestinationMobileMerge::STATUS_REVOKED,
            'revoked_at' => now(),
        ]);

        return $merge->fresh();
    }

    public function revoke(TelegramDestinationMobileMerge $merge, ?int $revokedByUserId = null): TelegramDestinationMobileMerge
    {
        if (! $merge->isApproved()) {
            throw new RuntimeException('فقط ادغام‌های تأییدشده قابل لغو هستند.');
        }

        return DB::transaction(function () use ($merge, $revokedByUserId): TelegramDestinationMobileMerge {
            $merge->update([
                'status' => TelegramDestinationMobileMerge::STATUS_REVOKED,
                'revoked_by' => $revokedByUserId,
                'revoked_at' => now(),
            ]);

            $fresh = $merge->fresh(['telegramAccount', 'canonicalUser']);
            $this->pushHostAfterRevoke($fresh);

            return $fresh;
        });
    }

    public function pushHostForMerge(TelegramDestinationMobileMerge $merge): void
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return;
        }

        $activeAccount = $merge->telegramAccount
            ?? TelegramAccount::query()->find($merge->telegram_account_id);

        if ($activeAccount !== null) {
            $this->pushActiveMergedAccount($activeAccount, $merge);
        }

        $canonicalAccount = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('mobile', $merge->canonical_mobile)
            ->whereNotNull('mobile_verified_at')
            ->orderByDesc('updated_at')
            ->first();

        if ($canonicalAccount !== null
            && (int) $canonicalAccount->id !== (int) ($activeAccount?->id ?? 0)) {
            $payload = $this->snapshots->accountPayload($canonicalAccount->fresh(['user', 'bot']), true);
            $payload['destination_merge'] = [
                'role' => 'blocked',
                'partner_mobile' => $merge->telegram_mobile,
            ];
            $this->hostPush->pushAccount($payload);
        }
    }

    public function pushHostAfterRevoke(TelegramDestinationMobileMerge $merge): void
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return;
        }

        $activeAccount = $merge->telegramAccount
            ?? TelegramAccount::query()->find($merge->telegram_account_id);

        if ($activeAccount !== null) {
            $this->hostSync->pushAccountImmediate($activeAccount->fresh(['user', 'bot']), true);
        }

        $canonicalAccount = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('mobile', $merge->canonical_mobile)
            ->whereNotNull('mobile_verified_at')
            ->orderByDesc('updated_at')
            ->first();

        if ($canonicalAccount !== null) {
            $this->hostSync->pushAccountImmediate($canonicalAccount->fresh(['user', 'bot']), true);
        }
    }

    private function pushActiveMergedAccount(TelegramAccount $activeAccount, TelegramDestinationMobileMerge $merge): void
    {
        $canonicalUser = User::query()->with(['profile', 'identityProfile'])->find($merge->canonical_user_id);
        if ($canonicalUser === null) {
            return;
        }

        $bot = $activeAccount->bot ?? TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return;
        }

        $stub = new TelegramAccount([
            'mobile' => $merge->canonical_mobile,
            'user_id' => $canonicalUser->id,
            'display_name' => $activeAccount->display_name,
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => $activeAccount->telegram_user_id,
            'mobile_verified_at' => $activeAccount->mobile_verified_at ?? now(),
        ]);
        $stub->setRelation('user', $canonicalUser);
        $stub->setRelation('bot', $bot);

        $payload = [
            'telegram_user_id' => (int) $activeAccount->telegram_user_id,
            'user_id' => $canonicalUser->id,
            'mobile' => $activeAccount->mobile,
            'mobile_verified_at' => $activeAccount->mobile_verified_at?->toIso8601String(),
            'display_name' => $activeAccount->display_name,
            'is_bot_admin' => $activeAccount->isBotAdmin(),
            'verification_level' => max(1, (int) ($canonicalUser->identityProfile?->verification_level ?? 1)),
            'snapshot' => $this->snapshots->buildSnapshot($stub, true),
            'destination_merge' => [
                'role' => 'active',
                'partner_mobile' => $merge->canonical_mobile,
            ],
        ];

        $this->hostPush->pushAccount($payload);
    }

    private function maskMobile(string $mobile): string
    {
        $mobile = trim($mobile);
        if (strlen($mobile) < 6) {
            return $mobile;
        }

        return substr($mobile, 0, 4).'…'.substr($mobile, -3);
    }
}
