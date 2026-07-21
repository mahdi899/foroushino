<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\CourseAccessStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\CourseAccessService;
use App\Services\PurchaseGuardService;

/**
 * Course catalog UX: buy vs already-owned (watch link + SpotPlayer key + destinations).
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

        $access = $this->resolveAccess($account, $product);
        $licenseKey = $this->resolveLicenseKey($account, $product);
        $destRows = $this->destinationKeyboardRows($bot, $account, $product);
        $watchUrl = $access
            ? TelegramSiteUrl::courseWatchPage($access->id)
            : TelegramSiteUrl::coursesPanel();

        $lines = [
            '✅ <b>شما به این دوره دسترسی دارید</b>',
            '',
            '🎓 '.TelegramHtml::bold(trim((string) $product->title)),
            '──────────────',
            'برای پخش آنلاین داخل سایت، دکمه زیر را بزنید.',
        ];

        if (filled($licenseKey)) {
            $lines[] = '';
            $lines[] = '🔑 <b>کلید اسپات‌پلیر</b> (اپلیکیشن دسکتاپ/موبایل):';
            $lines[] = '<code>'.TelegramHtml::escape($licenseKey).'</code>';
        } else {
            $lines[] = '';
            $lines[] = '🔑 کلید اسپات‌پلیر هنوز آماده نیست — از پشتیبانی پیگیری کنید.';
        }

        if ($destRows !== []) {
            $lines[] = '';
            $lines[] = '📍 کانال/گروه‌های ویژه این دوره را هم می‌توانید از دکمه‌های زیر باز کنید.';
        }

        $keyboard = [];
        foreach (TelegramSiteUrl::urlKeyboardRow('▶️ پخش آنلاین در پنل', $watchUrl, 'success') as $row) {
            $keyboard[] = $row;
        }
        foreach ($destRows as $row) {
            $keyboard[] = $row;
        }

        return [
            'text' => implode("\n", $lines),
            'options' => array_filter([
                'parse_mode' => 'HTML',
                'reply_markup' => $keyboard !== []
                    ? ['inline_keyboard' => $keyboard]
                    : null,
            ]),
        ];
    }

    private function resolveAccess(TelegramAccount $account, Product $product): ?CourseAccess
    {
        $user = $account->user;
        if (! $user instanceof User) {
            return null;
        }

        $this->courseAccess->syncFromPaidOrders($user);

        return CourseAccess::query()
            ->where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->where('status', CourseAccessStatus::Active)
            ->orderByDesc('id')
            ->first();
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
