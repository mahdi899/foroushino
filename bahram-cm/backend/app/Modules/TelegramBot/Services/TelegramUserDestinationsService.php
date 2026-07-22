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
     *     status: 'member'|'invite',
     *     invite_url: ?string,
     *     mode: 'per_user'|'shared',
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

                $resolved = $this->inviteLinks->resolveForAccount($bot, $destination, $account);
                if ($resolved === null) {
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
                    'status' => $resolved['status'],
                    'invite_url' => $resolved['invite_url'],
                    'mode' => $resolved['mode'],
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
            if ($item['status'] !== 'invite' || blank($item['invite_url'])) {
                continue;
            }

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
            'ربات لینک عضویت را مستقیم برای شما می‌سازد. فقط با اکانت تلگرام خودتان درخواست بدهید.',
            '──────────────',
        ];

        foreach ($items as $item) {
            $lines = array_merge($lines, $this->formatDestinationLines($item));
        }

        return implode("\n", $lines);
    }

    /**
     * @param  array{
     *     destination: TelegramDestination,
     *     status: 'member'|'invite',
     *     invite_url: ?string,
     *     mode: 'per_user'|'shared',
     *     product_titles: list<string>
     * }  $item
     * @return list<string>
     */
    public function formatDestinationLines(array $item): array
    {
        $destination = $item['destination'];
        $lines = ['• <b>'.TelegramHtml::escape($destination->title).'</b>'];

        if ($item['product_titles'] !== []) {
            $lines[] = '  دوره: '.TelegramHtml::escape(implode('، ', $item['product_titles']));
        }

        if ($item['status'] === 'member') {
            $lines[] = '  '.TelegramCustomEmoji::tag('check').' شما عضو این گروه هستید.';

            return $lines;
        }

        if ($item['mode'] === 'per_user') {
            $lines[] = '  '.TelegramCustomEmoji::tag('lock').' لینک اختصاصی شما (بعد از عضویت حذف می‌شود):';
        } else {
            $lines[] = '  '.TelegramCustomEmoji::tag('lock').' لینک عضویت (فقط اکانت شما تأیید می‌شود):';
        }

        if (filled($item['invite_url'])) {
            $lines[] = '  <a href="'.TelegramHtml::escape((string) $item['invite_url']).'">'.TelegramHtml::escape((string) $item['invite_url']).'</a>';
        }

        return $lines;
    }
}
