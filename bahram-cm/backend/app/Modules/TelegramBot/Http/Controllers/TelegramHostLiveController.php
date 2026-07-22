<?php

namespace App\Modules\TelegramBot\Http\Controllers;

use App\Modules\TelegramBot\Http\Controllers\Concerns\ResolvesHostTelegramAccount;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Models\FamilyPost;
use App\Models\FamilyPostView;
use App\Models\FamilyMembership;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Services\BotMessageCatalog;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\SupportTicketBridgeService;
use App\Modules\TelegramBot\Services\TelegramAdminUserStatsService;
use App\Modules\TelegramBot\Services\TelegramCardToCardFlowService;
use App\Modules\TelegramBot\Services\TelegramCatalogMediaService;
use App\Modules\TelegramBot\Services\TelegramCheckoutService;
use App\Modules\TelegramBot\Services\TelegramCourseAccessPresenter;
use App\Modules\TelegramBot\Services\TelegramUserDestinationsService;
use App\Modules\TelegramBot\Services\TelegramOutboundMessenger;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramSatFlowService;
use App\Modules\TelegramBot\Services\TelegramSubscriberEligibility;
use App\Services\Family\FeedService;
use App\Services\Family\PostAudienceResolver;
use App\Enums\Family\FamilyPostStatus;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
use App\Services\DiscountService;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyAssignmentService;
use App\Services\ReferralService;
use App\Services\TelegramHostUpdateProcessor;
use App\Support\AesGcmCipher;
use App\Support\InflatedMemberCount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Live API for the external Telegram host — operations that must NEVER be
 * cached and always hit the authoritative data on this server (checkout,
 * discount preview, ownership, profile, support writes, …).
 *
 * The host app handles UI + conversation state locally; these endpoints
 * are the only bridge for money, identity, and cross-system writes.
 */
class TelegramHostLiveController
{
    use ResolvesHostTelegramAccount;

    public function __construct(
        private readonly TelegramProductCatalogService $catalog,
        private readonly TelegramCourseAccessPresenter $access,
        private readonly TelegramCheckoutService $checkout,
        private readonly DiscountService $discounts,
        private readonly TelegramAdminUserStatsService $userStats,
        private readonly TelegramHostUpdateProcessor $updateProcessor,
        private readonly ReferralService $referrals,
        private readonly FamilyAccessService $familyAccess,
        private readonly FamilyAssignmentService $familyAssignment,
        private readonly TelegramSatFlowService $satFlow,
        private readonly ConversationService $conversations,
        private readonly SupportTicketBridgeService $supportTickets,
        private readonly TelegramOutboundMessenger $outbound,
        private readonly BotMessageCatalog $messages,
        private readonly TelegramCardToCardFlowService $cardToCardFlow,
        private readonly TelegramCatalogMediaService $catalogMedia,
        private readonly TelegramSubscriberEligibility $subscriberEligibility,
        private readonly TelegramUserDestinationsService $userDestinations,
        private readonly FeedService $familyFeed,
        private readonly PostAudienceResolver $postAudience,
    ) {}

    public function processUpdate(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $update = (array) ($payload['update'] ?? []);

        if ($update === []) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'update missing'], 422);
        }

        try {
            $this->updateProcessor->process($this->productionBot(), $update);
        } catch (Throwable $e) {
            report($e);
            Log::channel('telegram')->error('telegram.host.process_update_failed', [
                'message' => $e->getMessage(),
                'exception' => $e::class,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'update' => $update,
            ]);

            return $this->encryptedResponse($request, [
                'ok' => false,
                'message' => 'پردازش ناموفق بود.',
            ], 500);
        }

        return $this->encryptedResponse($request, ['ok' => true]);
    }

    public function productPresent(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $account = $this->resolveAccount($request);
        $productId = (int) ($payload['product_id'] ?? 0);

        if ($account === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'حساب یافت نشد.'], 404);
        }

        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'محصول یافت نشد.'], 404);
        }

        $bot = $this->productionBot();
        $view = $this->access->present($bot, $account, $product);
        $photo = $this->catalogMedia->productPhoto($product);

        return $this->encryptedResponse($request, [
            'ok' => true,
            'text' => $view['text'],
            'options' => $view['options'],
            'owns' => $this->access->owns($account, $product),
            'photo' => $photo,
        ]);
    }

    public function checkoutFlags(Request $request): JsonResponse
    {
        $bot = $this->productionBot();

        return $this->encryptedResponse($request, [
            'ok' => true,
            'zarinpal_enabled' => $this->checkout->zarinpalEnabled($bot),
            'c2c_enabled' => $this->checkout->cardToCardEnabled($bot),
        ]);
    }

    public function referralSummary(Request $request): JsonResponse
    {
        $account = $this->resolveAccount($request);
        $bot = $this->productionBot();

        if ($account === null || $account->user === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'ابتدا ثبت‌نام کنید.'], 403);
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

            return $this->encryptedResponse($request, [
                'ok' => true,
                'text' => $text,
                'reply_markup' => TelegramSiteUrl::linkMarkup($panelUrl, 'باشگاه مشتریان در پنل', [], 'success', 'gift'),
            ]);
        } catch (Throwable) {
            return $this->encryptedResponse($request, [
                'ok' => false,
                'message' => 'لینک معرفی در دسترس نیست. کمی بعد دوباره تلاش کنید.',
            ], 503);
        }
    }

    public function familySummary(Request $request): JsonResponse
    {
        $account = $this->resolveAccount($request);
        $familyUrl = TelegramSiteUrl::familyHome();

        if ($account === null || $account->user === null) {
            return $this->encryptedResponse($request, [
                'ok' => true,
                'text' => TelegramCustomEmoji::tag('family')." <b>خانواده</b>\n\nابتدا ثبت‌نام را کامل کنید.",
                'reply_markup' => TelegramSiteUrl::linkMarkup($familyUrl, 'صفحه خانواده', [], 'primary', 'globe'),
            ]);
        }

        $user = $account->user;

        try {
            $this->familyAssignment->assign($user);
        } catch (Throwable) {
            // best-effort
        }

        $membership = $this->familyAccess->homeMembership($user);
        if ($membership === null) {
            return $this->encryptedResponse($request, [
                'ok' => true,
                'text' => TelegramCustomEmoji::tag('family')." <b>خانواده</b>\n\nهنوز به خانواده‌ای وصل نیستید.\nبا ورود به وب‌اپ، عضویت شما فعال می‌شود.",
                'reply_markup' => TelegramSiteUrl::linkMarkup($familyUrl, 'ورود به خانواده', [], 'primary', 'globe'),
            ]);
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

        return $this->encryptedResponse($request, [
            'ok' => true,
            'text' => implode("\n", $lines),
            'reply_markup' => TelegramSiteUrl::linkMarkup($familyUrl, 'ورود به خانواده', [], 'primary', 'globe'),
        ]);
    }

    public function satOpen(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $account = $this->resolveAccount($request);
        $chatId = (int) ($payload['chat_id'] ?? 0);

        if ($account === null || $chatId <= 0) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'اطلاعات ناقص است.'], 422);
        }

        $bot = $this->productionBot();
        $payload = $this->satFlow->open($bot, $account, $chatId, deliverViaHost: true);
        $conversation = $this->conversations->forAccount($account);

        return $this->encryptedResponse($request, [
            'ok' => true,
            'text' => $payload['text'] ?? '',
            'options' => $payload['options'] ?? [],
            'state' => $conversation->state->value,
            'context' => $conversation->context ?? [],
        ]);
    }

    public function supportPrepare(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $account = $this->resolveAccount($request);
        $category = trim((string) ($payload['category'] ?? 'other'));

        if ($account === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'ابتدا ثبت‌نام کنید.'], 403);
        }

        $bot = $this->productionBot();
        $requiresSub = $bot->featureEnabled(BotFeatureFlag::TicketRequiresSubscription)
            || $bot->featureEnabled(BotFeatureFlag::SupportRequiresSubscription);

        if ($requiresSub && ! $this->subscriberEligibility->hasQualifyingAccess($account)) {
            return $this->encryptedResponse($request, [
                'ok' => false,
                'message' => $this->subscriberEligibility->denialMessage(),
            ], 403);
        }

        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::WaitingForSupportMessage, [
            'support' => ['category' => $category],
        ]);
        $conversation->refresh();

        return $this->encryptedResponse($request, [
            'ok' => true,
            'state' => $conversation->state->value,
            'context' => $conversation->context ?? [],
        ]);
    }

    public function supportTryReply(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $account = $this->resolveAccount($request);
        $message = (array) ($payload['message'] ?? []);

        if ($account === null || $message === []) {
            return $this->encryptedResponse($request, ['ok' => true, 'handled' => false]);
        }

        $bot = $this->productionBot();
        $handled = $this->supportTickets->tryHandleUserReplyToSupport($bot, $account, $message);

        return $this->encryptedResponse($request, ['ok' => true, 'handled' => $handled]);
    }

    public function supportSend(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $account = $this->resolveAccount($request);
        $chatId = (int) ($payload['chat_id'] ?? 0);
        $category = trim((string) ($payload['category'] ?? 'other'));
        $text = trim((string) ($payload['text'] ?? ''));
        $hasMedia = ! empty($payload['has_media']);

        if ($account === null || $chatId <= 0) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'اطلاعات ناقص است.'], 422);
        }

        $bot = $this->productionBot();

        if (blank($bot->reportsGroupChatId())) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'گروه گزارشات تنظیم نشده است.'], 503);
        }

        try {
            $ticket = $this->supportTickets->openOrContinue(
                $account,
                $category,
                SupportTicketBridgeService::CATEGORY_LABELS[$category] ?? 'پشتیبانی تلگرام',
            );
            $body = $text !== '' ? $text : ($hasMedia ? '[رسانه]' : '[پیام خالی]');
            $this->supportTickets->appendUserMessage($ticket, $body);
            $mirrored = $this->supportTickets->mirrorToSupportGroup(
                $bot,
                $ticket,
                $account,
                (int) ($payload['message_id'] ?? 0),
                $this->supportTickets->categoryTopicId($category),
                $category,
            );
        } catch (Throwable) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'ارسال پیام پشتیبانی ناموفق بود.'], 500);
        }

        $ack = $this->outbound->reply(
            $bot,
            $chatId,
            $this->messages->get($bot, 'support_message_received'),
            $this->messages->htmlOptions(),
            sync: true,
        );

        $ackId = (int) ($ack['message_id'] ?? 0);
        if ($ackId > 0 && ($mirrored['id_message_id'] ?? 0) > 0) {
            $this->supportTickets->mapSupportThreadToUser(
                $ticket->id,
                $mirrored['support_chat_id'],
                $mirrored['id_message_id'],
                (string) $chatId,
                $ackId,
                $mirrored['topic_id'] ?? null,
                $mirrored['forward_message_id'] ?? null,
            );
        }

        return $this->encryptedResponse($request, ['ok' => true]);
    }

    public function discountPreview(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $account = $this->resolveAccount($request);
        $code = trim((string) ($payload['code'] ?? ''));
        $productId = (int) ($payload['product_id'] ?? 0);

        if ($account === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'حساب تلگرام یافت نشد.'], 404);
        }

        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'محصول یافت نشد.'], 404);
        }

        try {
            $preview = $this->discounts->preview($code, $product, $account->user, $account->mobile, viaLink: false);
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: 'کد تخفیف معتبر نیست.';

            return $this->encryptedResponse($request, ['ok' => false, 'message' => (string) $message], 422);
        }

        return $this->encryptedResponse($request, [
            'ok' => true,
            'coupon' => $preview['discount_code']->normalizedCode(),
            'coupon_discount' => (int) $preview['coupon_discount'],
            'final_amount' => (int) $preview['final_amount'],
        ]);
    }

    public function accessOwns(Request $request): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $account = $this->resolveAccount($request);
        $productId = (int) ($payload['product_id'] ?? 0);

        if ($account === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'حساب یافت نشد.'], 404);
        }

        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'محصول یافت نشد.'], 404);
        }

        return $this->encryptedResponse($request, [
            'ok' => true,
            'owns' => $this->access->owns($account, $product),
        ]);
    }

    public function checkoutZarinpalStart(Request $request): JsonResponse
    {
        return $this->startCheckout($request, 'zarinpal');
    }

    public function checkoutC2cStart(Request $request): JsonResponse
    {
        return $this->startCheckout($request, 'c2c');
    }

    public function userProfile(Request $request): JsonResponse
    {
        $account = $this->resolveAccount($request);
        if ($account === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'حساب یافت نشد.'], 404);
        }

        $bot = $this->productionBot();
        $stats = $this->userStats->forAccount($account);
        $text = $this->userStats->formatProfileText($account);
        $destinationSection = $this->userDestinations->formatAccountSection($bot, $account);
        if ($destinationSection !== null) {
            $text .= "\n\n".$destinationSection;
        }

        $keyboard = [];
        foreach ($this->userDestinations->keyboardRows($bot, $account) as $row) {
            $keyboard[] = $row;
        }
        foreach (TelegramSiteUrl::urlKeyboardRow('احراز هویت سطح ۲', TelegramSiteUrl::identityPage(), 'primary', 'lock') as $row) {
            $keyboard[] = $row;
        }
        foreach (TelegramSiteUrl::urlKeyboardRow('ورود به پنل دانشجو', TelegramSiteUrl::studentPanel(), 'success', 'graduation') as $row) {
            $keyboard[] = $row;
        }

        return $this->encryptedResponse($request, [
            'ok' => true,
            'stats' => $stats,
            'text' => $text,
            'options' => array_filter([
                'parse_mode' => 'HTML',
                'reply_markup' => $keyboard !== []
                    ? ['inline_keyboard' => $keyboard]
                    : null,
            ]),
        ]);
    }

    private function startCheckout(Request $request, string $gateway): JsonResponse
    {
        $payload = $this->hostPayload($request);
        $account = $this->resolveAccount($request);
        $productId = (int) ($payload['product_id'] ?? 0);
        $coupon = trim((string) ($payload['coupon'] ?? '')) ?: null;

        if ($account === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'ابتدا ثبت‌نام کنید.'], 403);
        }

        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'محصول یافت نشد.'], 404);
        }

        $product->loadMissing('seminar');
        if ($product->seminar && $product->seminar->isFull()) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'ظرفیت سمینار تکمیل شده است.'], 409);
        }

        if ($this->access->owns($account, $product)) {
            return $this->encryptedResponse($request, ['ok' => false, 'message' => 'شما قبلاً این محصول را دارید.'], 409);
        }

        $bot = $this->productionBot();
        $chatId = (int) ($payload['chat_id'] ?? 0);

        if ($gateway === 'c2c') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::Idle, [
                'checkout' => ['product_id' => $productId, 'coupon' => $coupon],
            ]);

            try {
                $result = $this->checkout->startCardToCardCheckout($account, $product, $coupon);
            } catch (ValidationException $e) {
                $message = collect($e->errors())->flatten()->first() ?: 'خطا در شروع پرداخت.';

                return $this->encryptedResponse($request, ['ok' => false, 'message' => (string) $message], 422);
            }

            if ($chatId > 0) {
                $this->cardToCardFlow->beginWaitingForReceipt(
                    $bot,
                    $account,
                    $chatId,
                    (int) $result['order_id'],
                    (string) $product->title,
                    (int) $result['amount'],
                    (string) $result['instructions'],
                );
            }

            $conversation = $this->conversations->forAccount($account);

            return $this->encryptedResponse($request, [
                'ok' => true,
                'gateway' => 'c2c',
                'order_id' => (int) $result['order_id'],
                'amount' => (int) $result['amount'],
                'server_sent_prompt' => $chatId > 0,
                'state' => $conversation->state->value,
                'context' => $conversation->context ?? [],
            ]);
        }

        try {
            $result = $this->checkout->startZarinpalCheckout($account, $product, $coupon);
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: 'خطا در شروع پرداخت.';

            return $this->encryptedResponse($request, ['ok' => false, 'message' => (string) $message], 422);
        }

        return $this->encryptedResponse($request, array_merge(['ok' => true, 'gateway' => $gateway], $result));
    }

    private function familyUnreadPostCount(\App\Models\User $user, \App\Models\FamilyMembership $membership): int
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

    /** @param  array<string, mixed>  $data */
    private function encryptedResponse(Request $request, array $data, int $status = 200): JsonResponse
    {
        $aesKey = (string) $request->attributes->get('host_aes_key', '');
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($aesKey === '' || $json === false) {
            return response()->json($data, $status);
        }

        return response()->json(['payload' => AesGcmCipher::encrypt($json, $aesKey)], $status);
    }
}
