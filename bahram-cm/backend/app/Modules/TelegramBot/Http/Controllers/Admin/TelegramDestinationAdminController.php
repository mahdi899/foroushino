<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationRequirement;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramDestinationAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramBotRepository $bots,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.destinations.manage');

        $query = TelegramDestination::query()
            ->with(['bot:id,key,display_name', 'requirements'])
            ->withCount('requirements')
            ->orderByDesc('id');

        if ($botKey = $request->string('bot_key')->toString()) {
            $bot = $this->bots->findByKey($botKey);
            if ($bot) {
                $query->where('telegram_bot_id', $bot->id);
            }
        }

        return response()->json([
            'data' => $query->get()->map(fn (TelegramDestination $d) => $this->payload($d))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.destinations.manage');

        $data = $request->validate([
            'telegram_bot_id' => ['required_without:bot_key', 'integer', 'exists:telegram_bots,id'],
            'bot_key' => ['required_without:telegram_bot_id', 'string'],
            'title' => ['required', 'string', 'max:255'],
            'chat_id' => ['required', 'string', 'max:64'],
            'chat_type' => ['sometimes', 'string', 'max:32'],
            'username' => ['nullable', 'string', 'max:120'],
            'join_request_url' => ['nullable', 'string', 'max:500'],
            'access_mode' => ['sometimes', 'string', 'max:32', 'in:join_request,requirements,shared,per_user,per_user_join_request'],
            'is_active' => ['sometimes', 'boolean'],
            'welcome_inside_chat' => ['sometimes', 'boolean'],
            'settings' => ['sometimes', 'nullable', 'array'],
            'requirements' => ['sometimes', 'array'],
            'requirements.*.requirement_type' => ['required_with:requirements', 'string', 'max:64'],
            'requirements.*.requirement_value' => ['nullable', 'string', 'max:255'],
            'requirements.*.group_key' => ['nullable', 'string', 'max:64'],
            'requirements.*.operator' => ['nullable', 'string', 'in:all,any'],
        ]);

        if (! isset($data['telegram_bot_id']) && isset($data['bot_key'])) {
            $bot = $this->bots->findByKey($data['bot_key']);
            abort_unless($bot, 422, 'Bot not found');
            $data['telegram_bot_id'] = $bot->id;
        }

        $requirements = $data['requirements'] ?? [];
        unset($data['bot_key'], $data['requirements']);

        $destination = TelegramDestination::query()->create($data);

        foreach ($requirements as $req) {
            $destination->requirements()->create($req);
        }

        $destination->load(['bot'])->loadCount('requirements');

        return response()->json(['data' => $this->payload($destination, detailed: true)], 201);
    }

    public function show(Request $request, TelegramDestination $destination): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.destinations.manage');

        $destination->load(['bot', 'requirements']);

        return response()->json(['data' => $this->payload($destination, detailed: true)]);
    }

    public function update(Request $request, TelegramDestination $destination): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.destinations.manage');

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'chat_id' => ['sometimes', 'string', 'max:64'],
            'chat_type' => ['sometimes', 'string', 'max:32'],
            'username' => ['sometimes', 'nullable', 'string', 'max:120'],
            'join_request_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'access_mode' => ['sometimes', 'string', 'max:32', 'in:join_request,requirements,shared,per_user,per_user_join_request'],
            'is_active' => ['sometimes', 'boolean'],
            'welcome_inside_chat' => ['sometimes', 'boolean'],
            'settings' => ['sometimes', 'nullable', 'array'],
        ]);

        $destination->update($data);

        $destination->load(['bot', 'requirements'])->loadCount('requirements');

        return response()->json(['data' => $this->payload($destination, detailed: true)]);
    }

    public function destroy(Request $request, TelegramDestination $destination): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.destinations.manage');

        $destination->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function storeRequirement(Request $request, TelegramDestination $destination): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.destinations.manage');

        $data = $request->validate([
            'requirement_type' => ['required', 'string', 'max:64'],
            'requirement_value' => ['nullable', 'string', 'max:255'],
            'group_key' => ['nullable', 'string', 'max:64'],
            'operator' => ['nullable', 'string', 'in:all,any'],
        ]);

        $requirement = $destination->requirements()->create($data);

        return response()->json(['data' => $this->requirementPayload($requirement)], 201);
    }

    public function destroyRequirement(Request $request, TelegramDestination $destination, TelegramDestinationRequirement $requirement): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.destinations.manage');
        abort_unless($requirement->telegram_destination_id === $destination->id, 404);

        $requirement->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function payload(TelegramDestination $destination, bool $detailed = false): array
    {
        $base = [
            'id' => $destination->id,
            'telegram_bot_id' => $destination->telegram_bot_id,
            'bot_key' => $destination->bot?->key,
            'bot_name' => $destination->bot?->display_name,
            'title' => $destination->title,
            'chat_id' => $destination->chat_id,
            'chat_type' => $destination->chat_type,
            'username' => $destination->username,
            'join_request_url' => $destination->join_request_url,
            'access_mode' => $destination->access_mode,
            'is_active' => $destination->is_active,
            'welcome_inside_chat' => $destination->welcome_inside_chat,
            'requirements_count' => $destination->requirements_count ?? $destination->requirements?->count() ?? 0,
            'created_at' => $destination->created_at?->toIso8601String(),
        ];

        if (! $detailed) {
            return array_merge($base, [
                'requirements' => ($destination->requirements ?? collect())->map(fn ($r) => $this->requirementPayload($r))->values(),
            ]);
        }

        return array_merge($base, [
            'settings' => $destination->settings ?? [],
            'requirements' => ($destination->requirements ?? collect())->map(fn ($r) => $this->requirementPayload($r))->values(),
        ]);
    }

    private function requirementPayload(TelegramDestinationRequirement $requirement): array
    {
        return [
            'id' => $requirement->id,
            'requirement_type' => $requirement->requirement_type,
            'requirement_value' => $requirement->requirement_value,
            'group_key' => $requirement->group_key,
            'operator' => $requirement->operator,
        ];
    }
}
