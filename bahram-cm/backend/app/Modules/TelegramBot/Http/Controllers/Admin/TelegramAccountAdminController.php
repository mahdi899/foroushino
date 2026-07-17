<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use App\Modules\TelegramBot\Services\RequiredChatMembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramAccountAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramBotRepository $bots,
        private readonly RequiredChatMembershipService $membership,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->authorizeTelegram($request, 'telegram.users.view');
        $canReveal = $user->isSuperAdmin() || $user->hasPermission('telegram.users.reveal_mobile');

        $query = TelegramAccount::query()
            ->with(['bot:id,key,display_name', 'user:id,name,mobile'])
            ->orderByDesc('id');

        if ($botKey = $request->string('bot_key')->toString()) {
            $bot = $this->bots->findByKey($botKey);
            if ($bot) {
                $query->where('telegram_bot_id', $bot->id);
            }
        }

        if ($request->has('linked')) {
            $request->boolean('linked')
                ? $query->whereNotNull('user_id')
                : $query->whereNull('user_id');
        }

        if ($request->has('is_blocked')) {
            $query->where('is_blocked', $request->boolean('is_blocked'));
        }

        if ($search = trim($request->string('search')->toString())) {
            $query->where(function ($q) use ($search): void {
                $q->where('telegram_username', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%")
                    ->orWhere('telegram_user_id', ctype_digit($search) ? '=' : 'like', ctype_digit($search) ? (int) $search : "%{$search}%");
            });
        }

        $paginator = $query->paginate(min(max((int) $request->input('per_page', 30), 1), 100));

        return $this->paginatedResponse($paginator, fn (TelegramAccount $account) => $this->payload($account, $canReveal));
    }

    public function show(Request $request, TelegramAccount $account): JsonResponse
    {
        $user = $this->authorizeTelegram($request, 'telegram.users.view');
        $canReveal = $user->isSuperAdmin() || $user->hasPermission('telegram.users.reveal_mobile');

        $account->load(['bot', 'user', 'conversation']);

        return response()->json(['data' => $this->payload($account, $canReveal, detailed: true)]);
    }

    public function update(Request $request, TelegramAccount $account): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.manage');

        if (! $account->exists) {
            $account = TelegramAccount::query()->findOrFail((int) $request->route('account'));
        }

        $data = $request->validate([
            'is_blocked' => ['sometimes', 'boolean'],
            'is_bot_admin' => ['sometimes', 'boolean'],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $account->update($data);

        return response()->json(['data' => $this->payload($account->fresh()->load(['bot', 'user']), true, detailed: true)]);
    }

    public function setBotAdmin(Request $request, TelegramAccount $account): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.manage');

        if (! $account->exists) {
            $account = TelegramAccount::query()->findOrFail((int) $request->route('account'));
        }

        $data = $request->validate([
            'is_bot_admin' => ['required', 'boolean'],
        ]);

        if ($account->isPermanentBotAdmin() && ! $data['is_bot_admin']) {
            return response()->json([
                'message' => 'این کاربر ادمین دائمی ربات است و قابل حذف نیست.',
                'error' => ['message_fa' => 'این کاربر ادمین دائمی ربات است و قابل حذف نیست.'],
            ], 422);
        }

        $account->update(['is_bot_admin' => $data['is_bot_admin']]);

        return response()->json(['data' => $this->payload($account->fresh()->load(['bot', 'user']), true, detailed: true)]);
    }

    public function unlink(Request $request, TelegramAccount $account): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.users.unlink');

        $account->update(['user_id' => null]);

        return response()->json(['data' => $this->payload($account->fresh()->load(['bot', 'user']), true, detailed: true)]);
    }

    public function invalidateMembershipCache(Request $request, TelegramAccount $account): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.manage');

        $account->loadMissing('bot');
        abort_unless($account->bot, 422, 'Bot not found');
        $this->membership->invalidateCache($account->bot, $account->telegram_user_id);

        return response()->json(['data' => ['ok' => true]]);
    }

    private function payload(TelegramAccount $account, bool $canReveal, bool $detailed = false): array
    {
        $mobile = $account->mobile;

        $base = [
            'id' => $account->id,
            'telegram_bot_id' => $account->telegram_bot_id,
            'bot_key' => $account->bot?->key,
            'bot_name' => $account->bot?->display_name,
            'telegram_user_id' => $account->telegram_user_id,
            'telegram_username' => $account->telegram_username,
            'first_name' => $account->first_name,
            'last_name' => $account->last_name,
            'display_name' => $account->display_name,
            'mobile_masked' => $this->maskMobile($mobile),
            'mobile' => $canReveal ? $mobile : null,
            'user_id' => $account->user_id,
            'user_name' => $account->user?->name,
            'is_blocked' => $account->is_blocked,
            'is_bot_admin' => (bool) $account->is_bot_admin,
            'is_linked' => $account->isLinked(),
            'mobile_verified_at' => $account->mobile_verified_at?->toIso8601String(),
            'created_at' => $account->created_at?->toIso8601String(),
        ];

        if (! $detailed) {
            return $base;
        }

        return array_merge($base, [
            'language_code' => $account->language_code,
            'conversation_state' => $account->conversation?->state?->value ?? $account->conversation?->state,
            'metadata' => $account->metadata ?? [],
        ]);
    }
}
