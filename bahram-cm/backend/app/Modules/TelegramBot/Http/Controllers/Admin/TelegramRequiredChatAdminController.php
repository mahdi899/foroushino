<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use App\Modules\TelegramBot\Services\RequiredChatMembershipService;
use App\Modules\TelegramBot\Support\TelegramChatIdResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramRequiredChatAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramBotRepository $bots,
        private readonly RequiredChatMembershipService $membership,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.required_chats.manage');

        $query = TelegramRequiredChat::query()->with('bot:id,key,display_name')->orderBy('sort_order');

        if ($botKey = $request->string('bot_key')->toString()) {
            $bot = $this->bots->findByKey($botKey);
            if ($bot) {
                $query->where('telegram_bot_id', $bot->id);
            }
        }

        return response()->json([
            'data' => $query->get()->map(fn (TelegramRequiredChat $chat) => $this->payload($chat))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.required_chats.manage');

        $data = $request->validate([
            'telegram_bot_id' => ['required_without:bot_key', 'integer', 'exists:telegram_bots,id'],
            'bot_key' => ['required_without:telegram_bot_id', 'string'],
            'chat_id' => ['required', 'string', 'max:64'],
            'title' => ['required', 'string', 'max:255'],
            'invite_link' => ['nullable', 'string', 'max:500'],
            'is_required' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (! isset($data['telegram_bot_id']) && isset($data['bot_key'])) {
            $bot = $this->bots->findByKey($data['bot_key']);
            abort_unless($bot, 422, 'Bot not found');
            $data['telegram_bot_id'] = $bot->id;
        }

        unset($data['bot_key']);

        $data['chat_id'] = $this->membership->resolveAndSyncChatId(
            $bot,
            (string) $data['chat_id'],
            isset($data['invite_link']) ? (string) $data['invite_link'] : null,
        );

        $bot = TelegramBot::query()->findOrFail((int) $data['telegram_bot_id']);
        $this->membership->assertBotCanVerifyMembership($bot, $data['chat_id']);

        $chat = TelegramRequiredChat::query()->create($data);

        return response()->json(['data' => $this->payload($chat->load('bot'))], 201);
    }

    public function update(Request $request, TelegramRequiredChat $requiredChat): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.required_chats.manage');

        $data = $request->validate([
            'chat_id' => ['sometimes', 'string', 'max:64'],
            'title' => ['sometimes', 'string', 'max:255'],
            'invite_link' => ['sometimes', 'nullable', 'string', 'max:500'],
            'is_required' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (array_key_exists('chat_id', $data) || array_key_exists('invite_link', $data)) {
            $bot = $requiredChat->bot ?? TelegramBot::query()->findOrFail($requiredChat->telegram_bot_id);
            $data['chat_id'] = $this->membership->resolveAndSyncChatId(
                $bot,
                (string) ($data['chat_id'] ?? $requiredChat->chat_id),
                array_key_exists('invite_link', $data) ? ($data['invite_link'] ?? null) : $requiredChat->invite_link,
            );
        }

        if (array_key_exists('chat_id', $data)) {
            $this->membership->assertBotCanVerifyMembership(
                $requiredChat->bot ?? TelegramBot::query()->findOrFail($requiredChat->telegram_bot_id),
                $data['chat_id'],
            );
        }

        $requiredChat->update($data);

        return response()->json(['data' => $this->payload($requiredChat->fresh()->load('bot'))]);
    }

    public function destroy(Request $request, TelegramRequiredChat $requiredChat): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.required_chats.manage');

        $requiredChat->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function payload(TelegramRequiredChat $chat): array
    {
        return [
            'id' => $chat->id,
            'telegram_bot_id' => $chat->telegram_bot_id,
            'bot_key' => $chat->bot?->key,
            'bot_name' => $chat->bot?->display_name,
            'chat_id' => $chat->chat_id,
            'title' => $chat->title,
            'invite_link' => $chat->invite_link,
            'is_required' => $chat->is_required,
            'is_active' => $chat->is_active,
            'sort_order' => $chat->sort_order,
            'created_at' => $chat->created_at?->toIso8601String(),
        ];
    }
}
