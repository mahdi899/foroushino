<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use App\Modules\TelegramBot\Services\BotMessageCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramMessageAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramBotRepository $bots,
        private readonly BotMessageCatalog $catalog,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.content.manage');
        $bot = $this->resolveBot($request);

        return response()->json(['data' => $this->catalog->listForBot($bot)]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.content.manage');
        $bot = $this->resolveBot($request);

        abort_unless(isset(BotMessageCatalog::DEFAULTS[$key]), 404);

        $max = str_starts_with($key, 'menu_btn_') ? 64 : 4000;
        $data = $request->validate([
            'body' => ['required', 'string', 'max:'.$max],
        ]);

        $body = $data['body'];
        if (str_starts_with($key, 'menu_btn_')) {
            $body = trim(preg_split("/\r\n|\n|\r/", $body)[0] ?? '');
            abort_if($body === '', 422, 'متن دکمه خالی است.');
        }

        $row = $this->catalog->set($bot, $key, $body);

        return response()->json([
            'data' => [
                'key' => $row->message_key,
                'body' => $row->body,
                'label' => $row->label_fa,
                'category' => $row->category,
                'is_custom' => true,
            ],
        ]);
    }

    public function reset(Request $request, string $key): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.content.manage');
        $bot = $this->resolveBot($request);

        abort_unless(isset(BotMessageCatalog::DEFAULTS[$key]), 404);

        $this->catalog->reset($bot, $key);

        return response()->json([
            'data' => [
                'key' => $key,
                'body' => BotMessageCatalog::DEFAULTS[$key]['body'],
                'label' => BotMessageCatalog::DEFAULTS[$key]['label'],
                'category' => BotMessageCatalog::DEFAULTS[$key]['category'],
                'is_custom' => false,
            ],
        ]);
    }

    private function resolveBot(Request $request)
    {
        $botKey = $request->string('bot_key')->toString();
        if ($botKey !== '') {
            $bot = $this->bots->findByKey($botKey);
            abort_unless($bot, 404, 'Bot not found');

            return $bot;
        }

        $bot = $this->bots->allActive()->first() ?? $this->bots->all()->first();
        abort_unless($bot, 404, 'Bot not found');

        return $bot;
    }
}
