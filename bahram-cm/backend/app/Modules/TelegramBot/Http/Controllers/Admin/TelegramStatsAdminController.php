<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use App\Modules\TelegramBot\Services\BotUsageStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramStatsAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramBotRepository $bots,
        private readonly BotUsageStatsService $stats,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.reports.view');

        $botKey = $request->string('bot_key')->toString();
        if ($botKey !== '') {
            $bot = $this->bots->findByKey($botKey);
        } else {
            $bot = $this->bots->allActive()->first() ?? $this->bots->all()->first();
        }

        abort_unless($bot, 404, 'Bot not found');

        $period = $request->string('period')->toString();
        if (in_array($period, ['day', 'week', 'month'], true)) {
            return response()->json(['data' => $this->stats->forPeriod($bot, $period)]);
        }

        return response()->json(['data' => $this->stats->summary($bot)]);
    }
}
