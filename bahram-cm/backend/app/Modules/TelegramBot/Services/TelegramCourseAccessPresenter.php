<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\CourseAccessService;
use App\Services\PurchaseGuardService;

/**
 * Course catalog UX: buy vs already-owned (SpotPlayer key + destinations).
 */
class TelegramCourseAccessPresenter
{
    public function __construct(
        private readonly PurchaseGuardService $purchaseGuard,
        private readonly CourseAccessService $courseAccess,
        private readonly DestinationAccessPolicy $destinations,
        private readonly TelegramContentPresenter $content,
    ) {}

    public function owns(TelegramAccount $account, Product $product): bool
    {
        if (! $account->user_id && blank($account->mobile)) {
            return false;
        }

        return $this->purchaseGuard->ownsProduct(
            $account->user,
            (string) ($account->mobile ?? $account->user?->mobile ?? ''),
            $product,
        );
    }

    /**
     * @return array{text: string, options: array<string, mixed>}
     */
    public function present(TelegramBot $bot, TelegramAccount $account, Product $product): array
    {
        if (! $this->owns($account, $product)) {
            return [
                'text' => $this->content->formatProductMessage($product),
                'options' => $this->content->productSendOptions($product),
            ];
        }

        $licenseKey = $this->resolveLicenseKey($account, $product);
        $destRows = $this->destinationKeyboardRows($bot, $account, $product);

        $lines = [
            '✅ شما این دوره را قبلاً خریده‌اید.',
            '',
            '🎓 '.$product->title,
            '',
        ];

        if (filled($licenseKey)) {
            $lines[] = '🔑 کلید اسپات‌پلیر:';
            $lines[] = $licenseKey;
            $lines[] = '';
        } else {
            $lines[] = '🔑 کلید اسپات‌پلیر هنوز صادر نشده است. از پنل دانشجو پیگیری کنید.';
            $lines[] = '';
        }

        if ($destRows !== []) {
            $lines[] = '📍 مقاصد قابل عضویت (بر اساس دسترسی شما):';
        } else {
            $lines[] = '📍 در حال حاضر مقصد فعالی برای عضویت شما تعریف نشده است.';
        }

        $keyboard = $destRows;
        foreach (TelegramSiteUrl::urlKeyboardRow('🌐 پنل دانشجو', TelegramSiteUrl::studentPanel()) as $row) {
            $keyboard[] = $row;
        }

        return [
            'text' => implode("\n", $lines),
            'options' => $keyboard !== []
                ? ['reply_markup' => ['inline_keyboard' => $keyboard]]
                : [],
        ];
    }

    private function resolveLicenseKey(TelegramAccount $account, Product $product): ?string
    {
        $user = $account->user;
        if ($user instanceof User) {
            $license = $this->courseAccess->resolveLicense($user, $product);
            if (filled($license?->license_key)) {
                return (string) $license->license_key;
            }
        }

        $order = Order::query()
            ->where('product_id', $product->id)
            ->whereIn('status', ['paid', 'fulfilled'])
            ->where(function ($q) use ($account): void {
                if ($account->user_id) {
                    $q->where('user_id', $account->user_id);
                }
                if (filled($account->mobile)) {
                    $q->orWhere('customer_phone', $account->mobile);
                }
            })
            ->whereNotNull('spotplayer_license_code')
            ->where('spotplayer_license_code', '!=', '')
            ->latest('id')
            ->first();

        return filled($order?->spotplayer_license_code)
            ? (string) $order->spotplayer_license_code
            : null;
    }

    /**
     * Destinations the user can join for this product (or any allowed destination tied to it).
     *
     * @return list<list<array{text: string, url: string}>>
     */
    private function destinationKeyboardRows(TelegramBot $bot, TelegramAccount $account, Product $product): array
    {
        $userId = $account->user_id;
        if (! $userId) {
            return [];
        }

        $items = TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->with('requirements')
            ->orderBy('id')
            ->get();

        $rows = [];
        foreach ($items as $destination) {
            $decision = $this->destinations->evaluate($destination, (int) $userId);
            if (! $decision['allowed']) {
                continue;
            }

            // Prefer destinations that require this product; still show manual grants.
            $requiresThisProduct = $destination->requirements->contains(
                fn ($req) => in_array($req->requirement_type, ['product', 'active_course_access'], true)
                    && (int) $req->requirement_value === (int) $product->id,
            );

            if (! $requiresThisProduct && $decision['reason'] !== 'manual_grant') {
                continue;
            }

            $url = filled($destination->join_request_url)
                ? (string) $destination->join_request_url
                : (filled($destination->username) ? 'https://t.me/'.ltrim((string) $destination->username, '@') : null);

            $button = TelegramSiteUrl::inlineButton('📍 '.$destination->title, $url);
            if ($button !== null) {
                $rows[] = [$button];
            }
        }

        return $rows;
    }
}
