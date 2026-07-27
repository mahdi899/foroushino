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
 */
class TelegramReferenceChannelPresenter
{
    public function __construct(
        private readonly PurchaseGuardService $purchaseGuard,
        private readonly ReferenceChannelAccessService $access,
        private readonly ReferenceChannelPricingService $pricing,
        private readonly DestinationInviteLinkService $inviteLinks,
    ) {}

    public function resolvePublishedChannel(): ?ReferenceChannel
    {
        return ReferenceChannel::query()
            ->where('status', 'published')
            ->whereNotNull('product_id')
            ->with(['product', 'telegramDestination'])
            ->orderByDesc('id')
            ->first();
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
        $description = trim(strip_tags((string) ($channel->description ?? '')));
        $lines = [
            TelegramCustomEmoji::tag('check').' <b>دسترسی کانال مرجع شما فعال است</b>',
            '',
            TelegramCustomEmoji::tag('channel').' '.TelegramHtml::bold(trim((string) $channel->title)),
            '──────────────',
        ];

        if ($description !== '') {
            $lines[] = TelegramHtml::escape(\Illuminate\Support\Str::limit($description, 400));
            $lines[] = '──────────────';
        }

        $keyboard = [];

        if (! $identityReady) {
            $lines[] = TelegramCustomEmoji::tag('lock').' <b>احراز هویت سطح ۲ لازم است</b>';
            $lines[] = 'بعد از تأیید کارشناس، لینک عضویت گروه مرجع برایتان فعال می‌شود.';
            foreach (TelegramSiteUrl::urlKeyboardRow('احراز هویت سطح ۲', TelegramSiteUrl::identityPage(), 'primary', 'lock') as $row) {
                $keyboard[] = $row;
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

        $destination = $channel->telegramDestination;
        if ($destination === null) {
            $lines[] = 'مقصد تلگرام هنوز تنظیم نشده است. با پشتیبانی در ارتباط باشید.';
        } else {
            $resolved = $this->inviteLinks->resolveForAccount($bot, $destination, $account);
            $inviteUrl = $resolved['invite_url'] ?? null;
            $status = $resolved['status'] ?? null;

            if ($status === 'member') {
                $lines[] = TelegramCustomEmoji::tag('check').' شما عضو گروه مرجع هستید.';
            } elseif (filled($inviteUrl)) {
                $lines[] = TelegramCustomEmoji::tag('pin').' <b>لینک عضویت اختصاصی شما</b>';
                $lines[] = 'این لینک فقط برای همین اکانت تلگرام است. روی دکمه بزنید و درخواست عضویت دهید.';
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
     * @return array{amount: int, final_amount: int, seminar_discount: int, seminar_off: bool}
     */
    public function quote(ReferenceChannel $channel, TelegramAccount $account): array
    {
        return $this->pricing->quote(
            $channel,
            $account->user,
            (string) ($account->mobile ?? $account->user?->mobile ?? ''),
        );
    }
}
