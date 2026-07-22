<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use Illuminate\Support\Collection;

class TelegramUserDestinationsService
{
    public function __construct(
        private readonly DestinationAccessPolicy $policy,
        private readonly DestinationInviteLinkService $inviteLinks,
    ) {}

    /**
     * @return Collection<int, array{
     *     destination: TelegramDestination,
     *     invite_url: string,
     *     product_titles: list<string>
     * }>
     */
    public function accessibleForAccount(TelegramBot $bot, TelegramAccount $account): Collection
    {
        $userId = $account->user_id;
        if (! $userId) {
            return collect();
        }

        return TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->with('requirements')
            ->orderBy('id')
            ->get()
            ->map(function (TelegramDestination $destination) use ($bot, $account, $userId) {
                $decision = $this->policy->evaluate($destination, (int) $userId);
                if (! $decision['allowed']) {
                    return null;
                }

                $inviteUrl = $this->inviteLinks->resolveInviteUrl($bot, $destination, $account);
                if (blank($inviteUrl)) {
                    return null;
                }

                $productIds = $destination->requirements
                    ->filter(fn ($req) => in_array($req->requirement_type, ['product', 'active_course_access'], true))
                    ->map(fn ($req) => (int) $req->requirement_value)
                    ->filter(fn (int $id) => $id > 0)
                    ->unique()
                    ->values()
                    ->all();

                $productTitles = $productIds === []
                    ? []
                    : Product::query()->whereIn('id', $productIds)->pluck('title')->map(fn ($t) => (string) $t)->all();

                return [
                    'destination' => $destination,
                    'invite_url' => (string) $inviteUrl,
                    'product_titles' => $productTitles,
                ];
            })
            ->filter()
            ->values();
    }

    /**
     * @return list<list<array{text: string, url: string}>>
     */
    public function keyboardRows(TelegramBot $bot, TelegramAccount $account): array
    {
        $rows = [];

        foreach ($this->accessibleForAccount($bot, $account) as $item) {
            $button = TelegramSiteUrl::inlineButton(
                (string) $item['destination']->title,
                (string) $item['invite_url'],
                null,
                'pin',
            );

            if ($button !== null) {
                $rows[] = [$button];
            }
        }

        return $rows;
    }

    public function formatAccountSection(TelegramBot $bot, TelegramAccount $account): ?string
    {
        $items = $this->accessibleForAccount($bot, $account);
        if ($items->isEmpty()) {
            return null;
        }

        $lines = [
            TelegramCustomEmoji::tag('pin').' <b>گروه‌های پشتیبانی شما</b>',
            'برای هر دوره‌ای که خریده‌اید، لینک اختصاصی عضویت در گروه پشتیبانی دارید.',
            '──────────────',
        ];

        foreach ($items as $item) {
            $destination = $item['destination'];
            $lines[] = '• <b>'.TelegramHtml::escape($destination->title).'</b>';
            if ($item['product_titles'] !== []) {
                $lines[] = '  دوره: '.TelegramHtml::escape(implode('، ', $item['product_titles']));
            }
            if ($destination->usesPerUserInvites()) {
                $lines[] = '  '.TelegramCustomEmoji::tag('lock').' لینک زیر فقط برای شماست.';
            }
        }

        return implode("\n", $lines);
    }
}
