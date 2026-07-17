<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBroadcast;
use App\Modules\TelegramBot\Models\TelegramBroadcastRecipient;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use App\Modules\TelegramBot\Services\BroadcastDispatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class TelegramBroadcastAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramBotRepository $bots,
        private readonly BroadcastDispatchService $broadcastDispatch,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.broadcast.create');

        $query = TelegramBroadcast::query()->with('bot:id,key,display_name')->orderByDesc('id');

        if ($botKey = $request->string('bot_key')->toString()) {
            $bot = $this->bots->findByKey($botKey);
            if ($bot) {
                $query->where('telegram_bot_id', $bot->id);
            }
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate(min(max((int) $request->input('per_page', 20), 1), 100));

        return $this->paginatedResponse($paginator, fn (TelegramBroadcast $b) => $this->payload($b));
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->authorizeTelegram($request, 'telegram.broadcast.create');

        $data = $request->validate([
            'telegram_bot_id' => ['required_without:bot_key', 'integer', 'exists:telegram_bots,id'],
            'bot_key' => ['required_without:telegram_bot_id', 'string'],
            'title' => ['required', 'string', 'max:255'],
            'text' => ['required', 'string', 'max:4000'],
            'options' => ['sometimes', 'array'],
            'segment_key' => ['nullable', 'string', 'max:120'],
        ]);

        if (! isset($data['telegram_bot_id']) && isset($data['bot_key'])) {
            $bot = $this->bots->findByKey($data['bot_key']);
            abort_unless($bot, 422, 'Bot not found');
            $data['telegram_bot_id'] = $bot->id;
        }

        $broadcast = TelegramBroadcast::query()->create([
            'telegram_bot_id' => $data['telegram_bot_id'],
            'title' => $data['title'],
            'status' => 'draft',
            'segment_key' => $data['segment_key'] ?? null,
            'content' => [
                'text' => $data['text'],
                'options' => $data['options'] ?? [],
            ],
            'created_by' => $user->id,
        ]);

        return response()->json(['data' => $this->payload($broadcast->load('bot'))], 201);
    }

    public function show(Request $request, TelegramBroadcast $broadcast): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.broadcast.create');

        $broadcast->load('bot');

        $stats = TelegramBroadcastRecipient::query()
            ->where('telegram_broadcast_id', $broadcast->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => array_merge($this->payload($broadcast, detailed: true), [
                'recipient_stats' => $stats,
            ]),
        ]);
    }

    public function update(Request $request, TelegramBroadcast $broadcast): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.broadcast.create');
        abort_unless($broadcast->status === 'draft', 422, 'Only draft broadcasts can be edited.');

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'text' => ['sometimes', 'string', 'max:4000'],
            'options' => ['sometimes', 'array'],
            'segment_key' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $content = $broadcast->content ?? [];
        if (isset($data['text'])) {
            $content['text'] = $data['text'];
        }
        if (isset($data['options'])) {
            $content['options'] = $data['options'];
        }

        $broadcast->update([
            'title' => $data['title'] ?? $broadcast->title,
            'segment_key' => $data['segment_key'] ?? $broadcast->segment_key,
            'content' => $content,
        ]);

        return response()->json(['data' => $this->payload($broadcast->refresh()->load('bot'), detailed: true)]);
    }

    public function approve(Request $request, TelegramBroadcast $broadcast): JsonResponse
    {
        $user = $this->authorizeTelegram($request, 'telegram.broadcast.approve');

        if ($broadcast->requires_second_approval && $broadcast->created_by === $user->id) {
            return response()->json([
                'error' => ['code' => 'second_approval_required', 'message_fa' => 'تأیید دوم توسط ادمین دیگر لازم است.'],
            ], 422);
        }

        $broadcast->update([
            'status' => 'approved',
            'approved_by' => $user->id,
        ]);

        return response()->json(['data' => $this->payload($broadcast->refresh()->load('bot'), detailed: true)]);
    }

    public function dispatch(Request $request, TelegramBroadcast $broadcast): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.broadcast.approve');

        return $this->queueBroadcast($broadcast);
    }

    public function sendNow(Request $request, TelegramBroadcast $broadcast): JsonResponse
    {
        $user = $this->authorizeTelegram($request, 'telegram.broadcast.approve');

        // Guard against unbound route models (empty instance without an id).
        if (! $broadcast->exists) {
            $broadcast = TelegramBroadcast::query()->findOrFail((int) $request->route('broadcast'));
        }

        $status = (string) $broadcast->status;

        if (! in_array($status, ['draft', 'approved', 'scheduled'], true)) {
            return response()->json([
                'error' => [
                    'code' => 'invalid_status',
                    'message_fa' => 'این پیام همگانی قابل ارسال نیست (وضعیت: '.($status !== '' ? $status : 'نامشخص').').',
                ],
            ], 422);
        }

        if ($status === 'draft') {
            if ($broadcast->requires_second_approval && $broadcast->created_by === $user->id) {
                return response()->json([
                    'error' => ['code' => 'second_approval_required', 'message_fa' => 'تأیید دوم توسط ادمین دیگر لازم است.'],
                ], 422);
            }

            $broadcast->update([
                'status' => 'approved',
                'approved_by' => $user->id,
            ]);
            $broadcast->refresh();
        }

        return $this->queueBroadcast($broadcast);
    }

    public function stop(Request $request, TelegramBroadcast $broadcast): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.broadcast.stop');

        $broadcast->update([
            'status' => 'stopped',
            'stopped_at' => now(),
        ]);

        return response()->json(['data' => $this->payload($broadcast->refresh()->load('bot'), detailed: true)]);
    }

    public function test(Request $request, TelegramBroadcast $broadcast): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.broadcast.test');

        $data = $request->validate([
            'telegram_account_id' => ['required_without:telegram_user_id', 'integer', 'exists:telegram_accounts,id'],
            'telegram_user_id' => ['required_without:telegram_account_id', 'integer'],
        ]);

        $account = isset($data['telegram_account_id'])
            ? TelegramAccount::query()->findOrFail($data['telegram_account_id'])
            : TelegramAccount::query()
                ->where('telegram_bot_id', $broadcast->telegram_bot_id)
                ->where('telegram_user_id', $data['telegram_user_id'])
                ->firstOrFail();

        $text = (string) ($broadcast->content['text'] ?? '');
        $options = (array) ($broadcast->content['options'] ?? []);

        $result = $this->clients->forBot($broadcast->loadMissing('bot')->bot)->sendMessage($account->telegram_user_id, $text, $options);

        return response()->json([
            'data' => [
                'ok' => true,
                'message_id' => data_get($result, 'message_id'),
                'telegram_account_id' => $account->id,
            ],
        ]);
    }

    private function queueBroadcast(TelegramBroadcast $broadcast): JsonResponse
    {
        try {
            $this->broadcastDispatch->queue($broadcast);
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => ['code' => 'dispatch_failed', 'message_fa' => $e->getMessage()],
            ], 422);
        }

        return response()->json(['data' => $this->payload($broadcast->refresh()->load('bot'), detailed: true)]);
    }

    private function payload(TelegramBroadcast $broadcast, bool $detailed = false): array
    {
        $base = [
            'id' => $broadcast->id,
            'telegram_bot_id' => $broadcast->telegram_bot_id,
            'bot_key' => $broadcast->bot?->key,
            'bot_name' => $broadcast->bot?->display_name,
            'title' => $broadcast->title,
            'status' => $broadcast->status,
            'segment_key' => $broadcast->segment_key,
            'audience_count' => $broadcast->audience_count,
            'requires_second_approval' => $broadcast->requires_second_approval,
            'created_by' => $broadcast->created_by,
            'approved_by' => $broadcast->approved_by,
            'scheduled_at' => $broadcast->scheduled_at?->toIso8601String(),
            'started_at' => $broadcast->started_at?->toIso8601String(),
            'finished_at' => $broadcast->finished_at?->toIso8601String(),
            'stopped_at' => $broadcast->stopped_at?->toIso8601String(),
            'created_at' => $broadcast->created_at?->toIso8601String(),
        ];

        if (! $detailed) {
            return $base;
        }

        return array_merge($base, [
            'text' => (string) ($broadcast->content['text'] ?? ''),
            'options' => (array) ($broadcast->content['options'] ?? []),
        ]);
    }
}
