<?php

namespace App\Services;

use App\Enums\Family\FamilyPostStatus;
use App\Enums\SatApplicationStatus;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\FamilyPostView;
use App\Models\SatApplication;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\BotResolver;
use App\Modules\TelegramBot\Services\TelegramAdminUserStatsService;
use App\Modules\TelegramBot\Services\TelegramCatalogMediaService;
use App\Modules\TelegramBot\Services\TelegramCourseAccessPresenter;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramSeminarCatalogService;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyAssignmentService;
use App\Services\Family\FeedService;
use App\Services\Family\PostAudienceResolver;
use App\Support\InflatedMemberCount;
use App\Support\StudentDisplayName;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Builds a read-only user snapshot for the external Telegram host DB.
 * Checkout, support threads, and registration still run on Iran.
 */
class TelegramHostAccountSnapshotService
{
    public function __construct(
        private readonly TelegramProductCatalogService $catalog,
        private readonly TelegramSeminarCatalogService $seminars,
        private readonly TelegramCourseAccessPresenter $access,
        private readonly TelegramCatalogMediaService $catalogMedia,
        private readonly TelegramAdminUserStatsService $userStats,
        private readonly ReferralService $referrals,
        private readonly FamilyAccessService $familyAccess,
        private readonly FamilyAssignmentService $familyAssignment,
        private readonly FeedService $familyFeed,
        private readonly PostAudienceResolver $postAudience,
        private readonly TelegramHostOwnershipResolver $ownership,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function accountPayload(TelegramAccount $account, bool $replaceOwnedProductIds = false): array
    {
        $account->loadMissing(['user', 'bot']);

        $verificationLevel = (int) ($account->user?->identityProfile?->verification_level ?? 1);

        return [
            'telegram_user_id' => (int) $account->telegram_user_id,
            'user_id' => $account->user_id,
            'mobile' => $account->mobile,
            'mobile_verified_at' => $account->mobile_verified_at?->toIso8601String(),
            'display_name' => StudentDisplayName::forTelegramAccount($account),
            'is_bot_admin' => $account->isBotAdmin(),
            'verification_level' => $verificationLevel,
            'snapshot' => $this->buildSnapshot($account, $replaceOwnedProductIds),
        ];
    }

    /**
     * Lightweight payload for registration/contact — skips heavy present/family
     * rendering so the host gets menu + owned IDs in one fast round-trip.
     * Full snapshot follows via {@see TelegramHostAccountSync::queuePush()}.
     *
     * @return array<string, mixed>
     */
    public function accountPayloadForRegistration(TelegramAccount $account): array
    {
        $account->loadMissing(['user', 'bot']);

        $account->loadMissing('user.identityProfile');
        $verificationLevel = (int) ($account->user?->identityProfile?->verification_level ?? 0);

        return [
            'telegram_user_id' => (int) $account->telegram_user_id,
            'user_id' => $account->user_id,
            'mobile' => $account->mobile,
            'mobile_verified_at' => $account->mobile_verified_at?->toIso8601String(),
            'display_name' => StudentDisplayName::forTelegramAccount($account),
            'is_bot_admin' => $account->isBotAdmin(),
            'verification_level' => $verificationLevel > 0 ? $verificationLevel : 1,
            'snapshot' => $this->buildRegistrationSnapshot($account),
        ];
    }

    /**
     * Full read-model for buyers who have never started the production bot.
     * Pushed to the foreign host keyed by mobile so /start shows licenses and
     * profile immediately after phone share — no Iran round-trip.
     *
     * @return array<string, mixed>
     */
    public function mobilePreProvisionPayload(User $user): array
    {
        $user->loadMissing(['profile', 'identityProfile']);
        $mobile = trim((string) $user->mobile);
        if ($mobile === '') {
            return [];
        }

        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return [];
        }

        $account = new TelegramAccount([
            'mobile' => $mobile,
            'user_id' => $user->id,
            'display_name' => StudentDisplayName::fromUser($user),
            'telegram_bot_id' => $bot->id,
            'mobile_verified_at' => $user->mobile_verified_at ?? now(),
        ]);
        $account->setRelation('user', $user);
        $account->setRelation('bot', $bot);

        $verificationLevel = max(1, (int) ($user->identityProfile?->verification_level ?? 1));
        $ownedProductIds = $this->ownership->ownedProductIdsForUser($user, $mobile);

        return [
            'mobile' => $mobile,
            'display_name' => StudentDisplayName::fromUser($user),
            'user_id' => $user->id,
            'verification_level' => $verificationLevel,
            'owned_product_ids' => $ownedProductIds,
            'snapshot' => $this->buildSnapshot($account),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function buildRegistrationSnapshot(TelegramAccount $account): array
    {
        return [
            'revision' => $this->newRevision(),
            'owned_product_ids' => $this->ownership->ownedProductIdsForAccount($account),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function buildSnapshot(TelegramAccount $account, bool $replaceOwnedProductIds = false): array
    {
        try {
            return $this->buildSnapshotCore($account, $replaceOwnedProductIds);
        } catch (Throwable $e) {
            Log::channel('telegram')->error('telegram.host.build_snapshot_failed', [
                'telegram_user_id' => $account->telegram_user_id,
                'user_id' => $account->user_id,
                'error' => $e->getMessage(),
            ]);

            return [
                'revision' => $this->newRevision(),
                'owned_product_ids' => $this->safeOwnedProductIds($account),
                'snapshot_degraded' => true,
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSnapshotCore(TelegramAccount $account, bool $replaceOwnedProductIds = false): array
    {
        $bot = $this->productionBotFor($account);
        if ($bot === null) {
            return [
                'revision' => $this->newRevision(),
                'replace_owned_product_ids' => $replaceOwnedProductIds,
            ];
        }

        $ownedIds = $this->ownership->ownedProductIdsForAccount($account);
        $presents = [];
        foreach ($ownedIds as $productId) {
            $product = $this->catalog->findForTelegram($productId);
            if ($product === null) {
                continue;
            }

            if ($product->isReferenceChannelProduct()) {
                $channel = $product->referenceChannel
                    ?? \App\Models\ReferenceChannel::query()->where('product_id', $product->id)->first();
                if ($channel === null) {
                    continue;
                }
                $view = app(\App\Modules\TelegramBot\Services\TelegramReferenceChannelPresenter::class)
                    ->presentOwned($bot, $account, $channel);
            } else {
                $view = $this->access->present($bot, $account, $product);
            }

            $presents[(string) $productId] = [
                'text' => $view['text'],
                'options' => $view['options'],
            ];
        }

        return [
            'revision' => $this->newRevision(),
            'owned_product_ids' => $ownedIds,
            'replace_owned_product_ids' => $replaceOwnedProductIds,
            'profile' => $this->profilePayload($bot, $account),
            'referral' => $this->referralPayload($account),
            'family' => $this->familyPayload($account),
            'owned_presents' => $presents,
            'sat' => $this->satPayload($account),
        ];
    }

    /** @return array<string, mixed> */
    private function satPayload(TelegramAccount $account): array
    {
        if (! $account->user_id) {
            return ['has_application' => false];
        }

        $app = SatApplication::query()
            ->where('user_id', $account->user_id)
            ->latest('id')
            ->first();

        if ($app === null) {
            return ['has_application' => false];
        }

        $status = $app->status instanceof SatApplicationStatus
            ? $app->status
            : SatApplicationStatus::tryFrom((string) $app->status);

        $label = match ($status) {
            SatApplicationStatus::Received => 'دریافت شد',
            SatApplicationStatus::Reviewing => 'در حال بررسی',
            SatApplicationStatus::Accepted => 'پذیرفته شد',
            SatApplicationStatus::Rejected => 'رد شده',
            default => (string) ($app->status ?? 'نامشخص'),
        };

        return [
            'has_application' => true,
            'status' => $status?->value ?? (string) $app->status,
            'status_label' => $label,
            'access_opened' => app(\App\Services\Sat\SatParticipantAccessService::class)
                ->hasOpenedAccessByUserId((int) $account->user_id),
            'text' => TelegramCustomEmoji::tag('bell').' <b>درخواست سات</b>'
                ."\nوضعیت: {$label}",
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function profilePayload(TelegramBot $bot, TelegramAccount $account): ?array
    {
        if ($account->mobile_verified_at === null) {
            return null;
        }

        $text = $this->userStats->formatProfileText($account);
        // Destinations / invite buttons are built on the foreign host (live membership).
        // Keep snapshot free of raw invite URLs.

        $account->loadMissing('user.identityProfile');
        $verificationLevel = (int) ($account->user?->identityProfile?->verification_level ?? 0);
        $pricing = app(SeminarAttendeeCoursePricing::class);
        $referencePricing = app(ReferenceChannelPricingService::class);
        $needsIdentityForReference = $verificationLevel < 2
            && $account->user_id
            && \App\Models\ReferenceChannelEntitlement::query()
                ->where('user_id', $account->user_id)
                ->exists();

        $keyboard = [];
        if ($needsIdentityForReference) {
            foreach (TelegramSiteUrl::urlKeyboardRow('احراز هویت سطح ۲', TelegramSiteUrl::identityPage(), 'primary', 'lock') as $row) {
                $keyboard[] = $row;
            }
        }
        foreach (TelegramSiteUrl::urlKeyboardRow('ورود به پنل دانشجو', TelegramSiteUrl::studentPanel(), 'success', 'graduation') as $row) {
            $keyboard[] = $row;
        }

        return [
            'ok' => true,
            'text' => $text,
            'verification_level' => $verificationLevel,
            'needs_identity_for_reference' => $needsIdentityForReference,
            'has_seminar' => $pricing->userHasSeminar($account->user, $account->mobile),
            // Max seminar→reference discount from admin panel, only if attendee (or owns seminar).
            'reference_seminar_discount' => $referencePricing->maxSeminarDiscount(
                $account->user,
                (string) ($account->mobile ?? ''),
            ),
            // Meta only (no is_member) — host checks Telegram live.
            'destinations' => $this->accessibleDestinationsMeta($bot, $account),
            'options' => array_filter([
                'parse_mode' => 'HTML',
                'reply_markup' => $keyboard !== []
                    ? ['inline_keyboard' => $keyboard]
                    : null,
            ]),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function accessibleDestinationsMeta(TelegramBot $bot, TelegramAccount $account): array
    {
        if (! $account->user_id) {
            return [];
        }

        $policy = app(\App\Modules\TelegramBot\Services\DestinationAccessPolicy::class);
        $allowedIds = \App\Modules\TelegramBot\Models\TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->with('requirements')
            ->orderBy('id')
            ->get()
            ->filter(fn ($destination) => (bool) ($policy->evaluate($destination, (int) $account->user_id)['allowed'] ?? false))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($allowedIds === []) {
            return [];
        }

        $allowedLookup = array_fill_keys($allowedIds, true);

        return array_values(array_filter(
            app(TelegramHostPayloadBuilder::class)->destinationsPayload($bot),
            fn (array $row): bool => isset($allowedLookup[(int) ($row['id'] ?? 0)]),
        ));
    }

    /**
     * @return array<string, mixed>|null
     */
    private function referralPayload(TelegramAccount $account): ?array
    {
        if ($account->user === null) {
            return ['ok' => false, 'message' => 'ابتدا ثبت‌نام کنید.'];
        }

        try {
            $code = $this->referrals->getOrCreateCode($account->user);
            $summary = $this->referrals->summary($account->user);
            $link = $this->referrals->referralLink($code->code);
            $panelUrl = TelegramSiteUrl::page('panel/referrals');
            $text = TelegramCustomEmoji::tag('gift').' <b>همکاری در فروش</b>'
                ."\n──────────────\n"
                .TelegramCustomEmoji::tag('pin').' لینک دعوت:'."\n<code>".TelegramHtml::escape($link)."</code>\n\n"
                .TelegramCustomEmoji::tag('notes').' کد اختصاصی: <code>'.TelegramHtml::escape((string) $code->code)."</code>\n\n"
                .TelegramCustomEmoji::tag('check').' خریدهای موفق: <b>'.number_format((int) ($summary['successful_purchases'] ?? 0))."</b>\n"
                .TelegramCustomEmoji::tag('money').' پاداش قابل برداشت: <b>'.number_format((int) ($summary['payable_amount'] ?? 0)).'</b> تومان';

            return [
                'ok' => true,
                'text' => $text,
                'reply_markup' => TelegramSiteUrl::linkMarkup($panelUrl, 'ورود به باشگاه', [], 'success', 'gift'),
            ];
        } catch (Throwable) {
            return [
                'ok' => false,
                'message' => 'لینک معرفی در دسترس نیست. کمی بعد دوباره تلاش کنید.',
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function familyPayload(TelegramAccount $account): array
    {
        $familyUrl = TelegramSiteUrl::familyHome();

        if ($account->user === null) {
            return [
                'ok' => true,
                'text' => TelegramCustomEmoji::tag('family')." <b>خانواده</b>\n\nابتدا ثبت‌نام را کامل کنید.",
                'reply_markup' => TelegramSiteUrl::familyClubLinkMarkup($familyUrl),
            ];
        }

        $user = $account->user;

        try {
            $this->familyAssignment->assign($user);
        } catch (Throwable) {
            // best-effort
        }

        $membership = $this->familyAccess->homeMembership($user);
        if ($membership === null) {
            return [
                'ok' => true,
                'text' => TelegramCustomEmoji::tag('family')." <b>خانواده</b>\n\nهنوز به خانواده‌ای وصل نیستید.\nبا ورود به وب‌اپ، عضویت شما فعال می‌شود.",
                'reply_markup' => TelegramSiteUrl::familyClubLinkMarkup($familyUrl),
            ];
        }

        $membership->loadMissing('family');
        $family = $membership->family;
        $memberCount = InflatedMemberCount::calculate((int) ($family?->member_count ?? 0));
        $unreadCount = $this->familyUnreadPostCount($user, $membership);

        $lines = [
            TelegramCustomEmoji::tag('family').' <b>خانواده شما</b>',
            '──────────────',
            TelegramCustomEmoji::tag('user').' <b>تعداد اعضا:</b> '.number_format($memberCount).' نفر',
        ];

        if ($unreadCount > 0) {
            $lines[] = TelegramCustomEmoji::tag('notes').' <b>پست‌های جدید:</b> '.number_format($unreadCount);
            $lines[] = '';
            $lines[] = $unreadCount === 1
                ? TelegramCustomEmoji::tag('sparkles').' یک پست جدید منتظر شماست — همین الان سر بزنید'
                : TelegramCustomEmoji::tag('sparkles').' '.number_format($unreadCount).' پست جدید منتظر شماست — بیا خانواده را چک کن';
        } else {
            $lines[] = TelegramCustomEmoji::tag('notes').' پست جدید ندیده‌شده: ۰';
            $lines[] = '';
            $lines[] = TelegramCustomEmoji::tag('point_up').' فعلاً همه‌چیز را دیده‌اید. برای حال‌وهوای خانواده یک سر بزنید.';
        }

        return [
            'ok' => true,
            'text' => implode("\n", $lines),
            'reply_markup' => TelegramSiteUrl::familyClubLinkMarkup($familyUrl),
        ];
    }

    private function familyUnreadPostCount(\App\Models\User $user, FamilyMembership $membership): int
    {
        try {
            $familyId = (int) $membership->family_id;
            $afterId = (int) FamilyPostView::query()
                ->where('user_id', $user->id)
                ->where('family_id', $familyId)
                ->max('post_id');

            if ($afterId > 0) {
                return max(0, (int) ($this->familyFeed->unreadSummary($afterId, $user)['unread_count'] ?? 0));
            }

            $joinedAt = $membership->joined_at;
            $query = FamilyPost::query()
                ->where('status', FamilyPostStatus::Published->value)
                ->whereNotNull('published_at');

            $this->postAudience->scopeVisibleToFamily($query, $familyId);

            if ($joinedAt) {
                $query->where('published_at', '>=', $joinedAt);
            }

            return max(0, (int) $query->count());
        } catch (Throwable) {
            return 0;
        }
    }

    private function productionBotFor(TelegramAccount $account): ?TelegramBot
    {
        if ($account->relationLoaded('bot') && $account->bot?->key === 'production') {
            return $account->bot;
        }

        try {
            return app(BotResolver::class)->resolve('production');
        } catch (Throwable) {
            return TelegramBot::query()->where('key', 'production')->first();
        }
    }

    /** @return list<int> */
    private function safeOwnedProductIds(TelegramAccount $account): array
    {
        try {
            return $this->ownership->ownedProductIdsForAccount($account);
        } catch (Throwable) {
            return [];
        }
    }

    private function newRevision(): string
    {
        return now()->format('YmdHis').'-'.Str::lower(Str::random(8));
    }
}
