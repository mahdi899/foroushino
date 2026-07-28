<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\UserIdentityProfile;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\PurchaseGuardService;
use App\Services\ReferenceChannelAccessService;
use App\Services\ReferenceChannelPricingService;

/**
 * «کانال مرجع» bot UX: sell / KYC gate / destination invite.
 *
 * Caption order (always): title → description → price (when selling) → short ownership footer (when owned).
 */
class TelegramReferenceChannelPresenter
{
    public function __construct(
        private readonly PurchaseGuardService $purchaseGuard,
        private readonly ReferenceChannelAccessService $access,
        private readonly ReferenceChannelPricingService $pricing,
        private readonly DestinationInviteLinkService $inviteLinks,
        private readonly BotMessageCatalog $messages,
    ) {}

    public function resolvePublishedChannel(): ?ReferenceChannel
    {
        $base = ReferenceChannel::query()
            ->where('status', 'published')
            ->where('show_in_telegram', true)
            ->whereNotNull('product_id')
            ->with(['product', 'telegramDestination']);

        // Prefer the marketing/storefront slug used by /reference-channels/kanal-mrgf.
        $canonical = (clone $base)->where('slug', 'kanal-mrgf')->first();

        return $canonical ?? $base->orderByDesc('id')->first();
    }

    public function owns(TelegramAccount $account, Product $product): bool
    {
        return $this->purchaseGuard->ownsProduct(
            $account->user,
            (string) ($account->mobile ?? $account->user?->mobile ?? ''),
            $product,
        );
    }

    public function hasIdentityLevel2(TelegramAccount $account): bool
    {
        $account->loadMissing('user');
        if (! $account->user_id) {
            return false;
        }

        $level = (int) (UserIdentityProfile::query()
            ->where('user_id', $account->user_id)
            ->value('verification_level') ?? 1);

        return $level >= 2;
    }

    /**
     * Full caption for the reference-channel screen.
     *
     * @return array{text: string, options: array<string, mixed>}
     */
    public function presentScreen(TelegramBot $bot, TelegramAccount $account, ReferenceChannel $channel, bool $owned): array
    {
        $blocks = [
            $this->titleBlock($channel),
            $this->descriptionBlock($bot, $channel),
        ];

        $options = ['parse_mode' => 'HTML'];

        if ($owned) {
            $ownedView = $this->presentOwned($bot, $account, $channel);
            $footer = trim((string) ($ownedView['text'] ?? ''));
            if ($footer !== '') {
                $blocks[] = $footer;
            }
            $ownedOptions = (array) ($ownedView['options'] ?? []);
            if ($ownedOptions !== []) {
                $options = array_merge($options, $ownedOptions);
            }
        } else {
            $blocks[] = $this->priceBlock($channel, $account);
        }

        return [
            'text' => implode("\n\n", array_values(array_filter($blocks, static fn (string $b): bool => trim($b) !== ''))),
            'options' => array_filter($options),
        ];
    }

    /**
     * Status + keyboard only (no title/description/price) — used in host snapshots too.
     *
     * @return array{text: string, options: array<string, mixed>}
     */
    public function presentOwned(TelegramBot $bot, TelegramAccount $account, ReferenceChannel $channel): array
    {
        $product = $channel->product;
        if ($product === null) {
            return [
                'text' => TelegramCustomEmoji::tag('warning').' محصول کانال مرجع پیکربندی نشده است.',
                'options' => ['parse_mode' => 'HTML'],
            ];
        }

        if ($account->user) {
            $this->access->syncFromPaidOrders($account->user);
        }

        $identityReady = $this->hasIdentityLevel2($account);
        $keyboard = [];

        if (! $identityReady) {
            foreach (TelegramSiteUrl::urlKeyboardRow('احراز هویت سطح ۲', TelegramSiteUrl::identityPage(), 'primary', 'lock') as $row) {
                $keyboard[] = $row;
            }
            foreach (TelegramSiteUrl::urlKeyboardRow('پنل کانال مرجع', TelegramSiteUrl::page('panel/reference-channel'), 'primary', 'channel') as $row) {
                $keyboard[] = $row;
            }

            return [
                'text' => TelegramCustomEmoji::tag('lock').' احراز هویت سطح ۲ لازم است تا لینک عضویت گروه مرجع فعال شود.',
                'options' => array_filter([
                    'parse_mode' => 'HTML',
                    'reply_markup' => $keyboard !== [] ? ['inline_keyboard' => $keyboard] : null,
                ]),
            ];
        }

        $destination = $channel->telegramDestination;
        $lines = [];

        if ($destination === null) {
            $lines[] = 'مقصد تلگرام هنوز تنظیم نشده است. با پشتیبانی در ارتباط باشید.';
        } else {
            $resolved = $this->inviteLinks->resolveForAccount($bot, $destination, $account);
            $inviteUrl = $resolved['invite_url'] ?? null;
            $status = $resolved['status'] ?? null;

            if ($status === 'member') {
                $lines[] = TelegramCustomEmoji::tag('check').' شما عضو گروه مرجع هستید.';
            } elseif (filled($inviteUrl)) {
                $lines[] = TelegramCustomEmoji::tag('pin').' لینک عضویت اختصاصی شما آماده است — فقط با همین اکانت درخواست بدهید.';
                foreach (TelegramSiteUrl::urlKeyboardRow('عضویت در گروه مرجع', (string) $inviteUrl, 'success', 'channel') as $row) {
                    $keyboard[] = $row;
                }
            } else {
                $lines[] = 'لینک عضویت در حال آماده‌سازی است. چند لحظه بعد دوباره «کانال مرجع» را بزنید.';
            }
        }

        foreach (TelegramSiteUrl::urlKeyboardRow('پنل کانال مرجع', TelegramSiteUrl::page('panel/reference-channel'), 'primary', 'channel') as $row) {
            $keyboard[] = $row;
        }

        return [
            'text' => implode("\n", $lines),
            'options' => array_filter([
                'parse_mode' => 'HTML',
                'reply_markup' => $keyboard !== [] ? ['inline_keyboard' => $keyboard] : null,
            ]),
        ];
    }

    /**
     * @return array{amount: int, final_amount: int, seminar_discount: int, seminar_off: bool, seminar_title: ?string}
     */
    public function quote(ReferenceChannel $channel, TelegramAccount $account): array
    {
        return $this->pricing->quote(
            $channel,
            $account->user,
            (string) ($account->mobile ?? $account->user?->mobile ?? ''),
        );
    }

    private function titleBlock(ReferenceChannel $channel): string
    {
        $title = trim((string) $channel->title);
        if ($title === '') {
            $title = 'کانال مرجع';
        }

        return TelegramCustomEmoji::tag('channel').' '.TelegramHtml::bold($title);
    }

    private function descriptionBlock(TelegramBot $bot, ReferenceChannel $channel): string
    {
        $fromChannel = $this->plainText((string) ($channel->description ?? ''));
        if ($this->isUsableDescription($fromChannel)) {
            return TelegramHtml::escape($fromChannel);
        }

        $fromBot = $this->descriptionFromBotMessage($bot);
        if ($fromBot !== '') {
            return $fromBot;
        }

        return 'با عضویت در کانال مرجع از آپدیت‌ها و فرصت‌های ویژه جا نمی‌مانید.';
    }

    private function priceBlock(ReferenceChannel $channel, TelegramAccount $account): string
    {
        $quote = $this->quote($channel, $account);
        $listPrice = (int) $quote['amount'];
        $finalPrice = (int) $quote['final_amount'];

        if ($quote['seminar_off'] && $finalPrice < $listPrice) {
            return TelegramCustomEmoji::tag('gift').' <b>چون در سمینار حضور داشتید</b>'."\n"
                .TelegramCustomEmoji::tag('money').' قیمت: <s>'.number_format($listPrice).' تومان</s>'."\n"
                .TelegramCustomEmoji::tag('fire').' با تخفیف سمینار: <b>'.number_format($finalPrice).' تومان</b>';
        }

        return TelegramCustomEmoji::tag('cart').' <b>قیمت دسترسی</b>'."\n"
            .TelegramCustomEmoji::tag('money').' <b>'.number_format($listPrice).' تومان</b>'."\n"
            .'اگر در سمینار شرکت کرده باشید، تخفیف ویژه روی حسابتان اعمال می‌شود.';
    }

    private function descriptionFromBotMessage(TelegramBot $bot): string
    {
        $raw = trim($this->messages->get($bot, 'reference_channel_description'));
        if ($raw === '') {
            return '';
        }

        // Older defaults started with a title line — keep only the body for this slot.
        $raw = preg_replace('/^(?:<tg-emoji[^>]*>.*?<\/tg-emoji>\s*)?<b>[^<]+<\/b>\s*/u', '', $raw) ?? $raw;
        $raw = preg_replace('/^📣\s*<b>[^<]+<\/b>\s*/u', '', $raw) ?? $raw;

        return trim($raw);
    }

    private function plainText(string $value): string
    {
        $text = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/[ \t]+/u", ' ', $text) ?? $text;
        $text = preg_replace("/\n{3,}/u", "\n\n", $text) ?? $text;

        return trim($text);
    }

    private function isUsableDescription(string $text): bool
    {
        if ($text === '' || mb_strlen($text) < 8) {
            return false;
        }

        $normalized = mb_strtolower($text);

        return ! in_array($normalized, ['/start', 'start', '-', 'null', 'n/a'], true);
    }
}
