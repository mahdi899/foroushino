<?php

namespace App\Services;

use App\Models\DiscountCode;
use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\Seminar;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use App\Modules\TelegramBot\Models\TelegramSupportCategory;
use App\Modules\TelegramBot\Services\BotMessageCatalog;
use App\Modules\TelegramBot\Services\TelegramCatalogMediaService;
use App\Modules\TelegramBot\Services\TelegramCheckoutService;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramSeminarCatalogService;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\DiscountService;
use Illuminate\Support\Facades\Log;

/**
 * Builds the exact bootstrap/catalog payloads served to the external
 * Telegram "host" app. Shared by:
 *  - TelegramHostSyncController (HTTP pull — host cron / manual refresh)
 *  - TelegramHostPushService (Iran → host push — embeds the data directly
 *    in the push so the host never has to call back to Iran to fetch it).
 *
 * Keeping this in one place means the push and pull paths can never drift
 * apart, and the push path needs zero extra network round-trips.
 */
class TelegramHostPayloadBuilder
{
    public function __construct(
        private readonly BotMessageCatalog $messages,
        private readonly TelegramProductCatalogService $products,
        private readonly TelegramSeminarCatalogService $seminars,
        private readonly TelegramCatalogMediaService $catalogMedia,
        private readonly TelegramCheckoutService $checkout,
        private readonly TelegramInfrastructureService $infrastructure,
        private readonly TelegramHostCatalogRevision $catalogRevision,
        private readonly DiscountService $discounts,
    ) {}

    public function productionBot(): ?TelegramBot
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();

        if ($bot === null) {
            Log::channel('telegram')->error('Telegram host payload builder: production bot not found.');
        }

        return $bot;
    }

    /**
     * @return array<string, mixed>
     *
     * @throws \RuntimeException when the production bot is not configured —
     *  callers (push/pull) must never treat a missing bot as "empty but
     *  valid" data; that used to silently overwrite the host's cache with a
     *  blank bootstrap (no messages, no features, no required chats).
     */
    public function bootstrapPayload(?TelegramBot $bot = null): array
    {
        $bot ??= $this->productionBot();
        if ($bot === null) {
            throw new \RuntimeException('Telegram host payload builder: production bot not found — refusing to build an empty bootstrap payload.');
        }

        $messages = collect(BotMessageCatalog::defaults())
            ->mapWithKeys(fn (array $default, string $key) => [$key => $this->messages->get($bot, $key)])
            ->all();

        $requiredChats = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'chat_id', 'title', 'invite_link', 'is_required'])
            ->toArray();

        $features = [];
        foreach (BotFeatureFlag::cases() as $flag) {
            $features[$flag->value] = $bot->featureEnabled($flag);
        }

        $supportCategories = TelegramSupportCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['key', 'title_fa', 'default_topic_id', 'sort_order'])
            ->map(fn (TelegramSupportCategory $c) => [
                'key' => $c->key,
                'title_fa' => $c->title_fa,
                'default_topic_id' => $c->default_topic_id,
                'sort_order' => $c->sort_order,
            ])
            ->values()
            ->all();

        return array_merge([
            'bot' => [
                'id' => $bot->id,
                'key' => $bot->key,
                'features' => $features,
                'is_active' => (bool) $bot->is_active,
                'reports_group_chat_id' => $bot->reportsGroupChatId(),
                'permanent_admin_user_ids' => array_values(array_map(
                    'intval',
                    (array) config('telegram_bot.permanent_admins.telegram_user_ids', []),
                )),
            ],
            'messages' => $messages,
            'required_chats' => $requiredChats,
            'support_categories' => $supportCategories,
            'destinations' => $this->destinationsPayload($bot),
            'checkout' => [
                'zarinpal_enabled' => $this->checkout->zarinpalEnabled($bot),
                'c2c_enabled' => $this->checkout->cardToCardEnabled($bot),
                'c2c_has_details' => $bot->hasCardToCardDetails(),
                'c2c_ready' => $bot->cardToCardReady(),
                'card_to_card' => $bot->cardToCardConfig(),
                'payment_reports_chat_id' => $bot->paymentReportsChatId(),
            ],
            'site_urls' => [
                'identity' => TelegramSiteUrl::identityPage(),
                'family' => TelegramSiteUrl::familyHome(),
                'sat' => TelegramSiteUrl::satPage(),
                'referral_panel' => TelegramSiteUrl::page('panel/referrals'),
                'reference_channel' => $this->referenceChannelInviteUrl($bot),
            ],
            'synced_at' => now()->toIso8601String(),
            'catalog_revision' => $this->catalogRevision->current(),
        ], $this->infrastructure->pendingHostWebhookBootstrapExtra());
    }

    /** @return array<string, mixed> */
    public function catalogPayload(): array
    {
        $courses = $this->products->listPublicCourses()->map(function (Product $p) {
            return [
                'id' => $p->id,
                'slug' => $p->slug,
                'title' => $p->title,
                'price' => $p->price,
                'sale_price' => $p->sale_price,
                'photo_source' => $this->catalogMedia->productPhotoSourceUrl($p),
                'telegram_photo_file_id' => $this->catalogMedia->productTelegramFileId($p),
                'product_type' => $p->type,
            ];
        })->values();

        $referenceChannels = ReferenceChannel::query()
            ->where('status', 'published')
            ->whereNotNull('product_id')
            ->with('product')
            ->orderByDesc('id')
            ->get()
            ->map(function (ReferenceChannel $channel) {
                $product = $channel->product;
                $photoSource = $product ? $this->catalogMedia->productPhotoSourceUrl($product) : null;
                $fileId = $product ? $this->catalogMedia->productTelegramFileId($product) : null;

                return [
                    'id' => $channel->id,
                    'product_id' => $channel->product_id,
                    'slug' => $product?->slug ?? ('reference-'.$channel->slug),
                    'title' => $channel->title,
                    'price' => (int) $channel->price,
                    'sale_price' => null,
                    'photo_source' => $photoSource,
                    'telegram_photo_file_id' => $fileId,
                    'description' => $channel->description,
                    'product_type' => Product::TYPE_REFERENCE_CHANNEL,
                ];
            })
            ->values();

        $seminars = $this->seminars->listUpcoming()
            ->merge($this->seminarsWithReferenceDiscount())
            ->unique('id')
            ->values()
            ->map(function (Seminar $s) {
            $s->loadMissing('product');
            $product = $s->product;
            $base = (int) ($s->price ?: $product?->price ?: 0);
            $saleRaw = $s->sale_price ?? $product?->sale_price;
            $sale = $saleRaw !== null ? (int) $saleRaw : null;

            return [
                'id' => $s->id,
                'product_id' => $s->product_id,
                'title' => $s->title,
                'date' => $s->date?->toIso8601String(),
                'location' => $s->location,
                'capacity_hint' => $s->remainingSeats(),
                'is_full' => $s->isFull(),
                'is_ended' => $s->isEnded(),
                'slug' => (string) ($s->slug ?? ''),
                'price' => $base,
                'sale_price' => $sale,
                'photo_source' => $this->catalogMedia->seminarPhotoSourceUrl($s),
                'telegram_photo_file_id' => $this->catalogMedia->seminarTelegramFileId($s),
                'reference_discount_amount' => (int) ($s->reference_discount_amount ?? 0),
            ];
        })->values();

        $bot = $this->productionBot();

        return [
            'courses' => $courses,
            'reference_channels' => $referenceChannels,
            'seminars' => $seminars,
            'discount_codes' => $this->discountCodesPayload(),
            'destinations' => $bot !== null ? $this->destinationsPayload($bot) : [],
            'synced_at' => now()->toIso8601String(),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function discountCodesPayload(): array
    {
        return DiscountCode::query()
            ->where('is_active', true)
            ->with(['products:id'])
            ->orderByDesc('id')
            ->limit(500)
            ->get()
            ->map(function (DiscountCode $code): array {
                return [
                    'code' => strtoupper((string) $code->code),
                    'discount_type' => $code->discount_type instanceof \BackedEnum
                        ? $code->discount_type->value
                        : (string) $code->discount_type,
                    'discount_value' => (int) $code->discount_value,
                    'max_discount_amount' => $code->max_discount_amount,
                    'min_order_amount' => $code->min_order_amount,
                    'starts_at' => $code->starts_at?->toIso8601String(),
                    'ends_at' => $code->ends_at?->toIso8601String(),
                    'max_uses' => $code->max_uses,
                    'uses_reserved' => $this->discounts->reservedUsageCount((int) $code->id),
                    'max_uses_per_user' => $code->max_uses_per_user,
                    'restriction' => $code->restriction instanceof \BackedEnum
                        ? $code->restriction->value
                        : (string) $code->restriction,
                    'requires_link' => (bool) $code->requires_link,
                    'is_active' => (bool) $code->is_active,
                    'product_ids' => $code->products->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Destinations for the foreign host — membership checks run there via Bot API.
     *
     * @return list<array<string, mixed>>
     */
    public function destinationsPayload(TelegramBot $bot): array
    {
        return TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->with('requirements')
            ->orderBy('id')
            ->get()
            ->map(function (TelegramDestination $destination): array {
                $productIds = $destination->requirements
                    ->filter(fn ($req) => in_array($req->requirement_type, ['product', 'active_course_access'], true))
                    ->map(fn ($req) => (int) $req->requirement_value)
                    ->filter(fn (int $id) => $id > 0)
                    ->unique()
                    ->values()
                    ->all();

                $productTitles = $productIds === []
                    ? []
                    : Product::query()
                        ->whereIn('id', $productIds)
                        ->pluck('title')
                        ->map(fn ($t) => (string) $t)
                        ->all();

                $satMembership = $destination->requirements
                    ->contains(fn ($req) => $req->requirement_type === 'sat_membership');

                if ($satMembership && $productTitles === []) {
                    $productTitles = ['عضویت فعال سات'];
                }

                $perUser = $destination->usesPerUserInvites();
                $sharedUrl = null;
                if (! $perUser) {
                    if (filled($destination->join_request_url)) {
                        $sharedUrl = (string) $destination->join_request_url;
                    } elseif (filled($destination->username)) {
                        $sharedUrl = 'https://t.me/'.ltrim((string) $destination->username, '@');
                    }
                }

                $requiresIdentityLevel2 = ReferenceChannel::query()
                    ->where('telegram_destination_id', $destination->id)
                    ->exists();

                return [
                    'id' => (int) $destination->id,
                    'title' => (string) $destination->title,
                    'chat_id' => (string) $destination->chat_id,
                    'invite_mode' => $perUser ? 'per_user' : 'shared',
                    'shared_invite_url' => $sharedUrl,
                    'product_ids' => $productIds,
                    'product_titles' => $productTitles,
                    'sat_membership' => $satMembership,
                    'requires_identity_level_2' => $requiresIdentityLevel2,
                ];
            })
            ->values()
            ->all();
    }

    private function referenceChannelInviteUrl(TelegramBot $bot): ?string
    {
        $url = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->whereNotNull('invite_link')
            ->where('invite_link', '!=', '')
            ->orderBy('sort_order')
            ->value('invite_link');

        return filled($url) ? (string) $url : null;
    }

    /**
     * Past/ended seminars still unlock reference-channel discount when
     * {@see Seminar::$reference_discount_amount} is set in admin.
     *
     * @return \Illuminate\Support\Collection<int, Seminar>
     */
    private function seminarsWithReferenceDiscount(): \Illuminate\Support\Collection
    {
        return Seminar::query()
            ->with(['product:id,slug,is_active,price,sale_price,show_in_telegram,title'])
            ->where('status', 'published')
            ->where('reference_discount_amount', '>', 0)
            ->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->orderByDesc('reference_discount_amount')
            ->limit(20)
            ->get();
    }
}
