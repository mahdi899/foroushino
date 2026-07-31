<?php

namespace App\Services;

use App\Enums\CourseAccessStatus;
use App\Enums\Family\FamilyPostStatus;
use App\Enums\SatApplicationStatus;
use App\Models\CourseAccess;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\FamilyPostView;
use App\Models\Product;
use App\Models\SatApplication;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
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
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function accountPayload(TelegramAccount $account): array
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
            'snapshot' => $this->buildSnapshot($account),
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

        return [
            'telegram_user_id' => (int) $account->telegram_user_id,
            'user_id' => $account->user_id,
            'mobile' => $account->mobile,
            'mobile_verified_at' => $account->mobile_verified_at?->toIso8601String(),
            'display_name' => StudentDisplayName::forTelegramAccount($account),
            'is_bot_admin' => $account->isBotAdmin(),
            'snapshot' => $this->buildRegistrationSnapshot($account),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function buildRegistrationSnapshot(TelegramAccount $account): array
    {
        $account->loadMissing('user.identityProfile');
        $verificationLevel = (int) ($account->user?->identityProfile?->verification_level ?? 0);

        $snapshot = [
            'revision' => $this->newRevision(),
            'owned_product_ids' => $this->ownedProductIdsFast($account),
        ];

        if ($verificationLevel > 0) {
            $snapshot['profile'] = ['verification_level' => $verificationLevel];
        }

        return $snapshot;
    }

    /** @return list<int> */
    private function ownedProductIdsFast(TelegramAccount $account): array
    {
        if (! $account->user_id) {
            return [];
        }

        return CourseAccess::query()
            ->where('user_id', $account->user_id)
            ->where('status', CourseAccessStatus::Active)
            ->pluck('product_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function buildSnapshot(TelegramAccount $account): array
    {
        $bot = $this->productionBotFor($account);
        if ($bot === null) {
            return ['revision' => $this->newRevision()];
        }

        $ownedIds = $this->ownedProductIds($account);
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
                'photo' => $this->catalogMedia->productPhoto($product),
            ];
        }

        return [
            'revision' => $this->newRevision(),
            'owned_product_ids' => $ownedIds,
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

    /** @return list<int> */
    private function ownedProductIds(TelegramAccount $account): array
    {
        if (! $account->user_id && blank($account->mobile)) {
            return [];
        }

        $ids = [];
        foreach ($this->catalog->listPublicCourses() as $product) {
            if ($this->access->owns($account, $product)) {
                $ids[] = (int) $product->id;
            }
        }

        foreach ($this->seminars->listUpcoming() as $seminar) {
            $product = $seminar->product;
            if (! $product instanceof Product) {
                continue;
            }
            if ($this->access->owns($account, $product)) {
                $ids[] = (int) $product->id;
            }
        }

        foreach ($this->catalog->listPublicReferenceChannels() as $product) {
            if ($this->access->owns($account, $product)) {
                $ids[] = (int) $product->id;
            }
        }

        return array_values(array_unique($ids));
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
        if ($account->bot?->key === 'production') {
            return $account->bot;
        }

        return TelegramBot::query()->where('key', 'production')->first();
    }

    private function newRevision(): string
    {
        return now()->format('YmdHis').'-'.Str::lower(Str::random(8));
    }
}
