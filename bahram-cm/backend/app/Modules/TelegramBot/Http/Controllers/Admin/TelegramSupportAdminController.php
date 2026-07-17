<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Models\User;
use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Models\TelegramOperatorProfile;
use App\Modules\TelegramBot\Models\TelegramSupportCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramSupportAdminController
{
    use AuthorizesTelegramAdmin;

    public function categories(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.support.manage');

        return response()->json([
            'data' => TelegramSupportCategory::query()
                ->orderBy('sort_order')
                ->get()
                ->map(fn (TelegramSupportCategory $c) => $this->categoryPayload($c))
                ->values(),
        ]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.support.manage');

        $data = $request->validate([
            'key' => ['required', 'string', 'max:64', 'unique:telegram_support_categories,key'],
            'title_fa' => ['required', 'string', 'max:255'],
            'default_topic_id' => ['nullable', 'integer'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $category = TelegramSupportCategory::query()->create($data);

        return response()->json(['data' => $this->categoryPayload($category)], 201);
    }

    public function updateCategory(Request $request, TelegramSupportCategory $category): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.support.manage');

        $data = $request->validate([
            'key' => ['sometimes', 'string', 'max:64', 'unique:telegram_support_categories,key,'.$category->id],
            'title_fa' => ['sometimes', 'string', 'max:255'],
            'default_topic_id' => ['sometimes', 'nullable', 'integer'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $category->update($data);

        return response()->json(['data' => $this->categoryPayload($category->fresh())]);
    }

    public function destroyCategory(Request $request, TelegramSupportCategory $category): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.support.manage');

        $category->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function operators(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.operators.manage');

        return response()->json([
            'data' => TelegramOperatorProfile::query()
                ->with('admin:id,name,email')
                ->orderByDesc('id')
                ->get()
                ->map(fn (TelegramOperatorProfile $o) => $this->operatorPayload($o))
                ->values(),
        ]);
    }

    public function storeOperator(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.operators.manage');

        $data = $request->validate([
            'telegram_user_id' => ['required', 'integer', 'unique:telegram_operator_profiles,telegram_user_id'],
            'admin_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'display_name' => ['nullable', 'string', 'max:120'],
            'support_role' => ['sometimes', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'settings' => ['sometimes', 'nullable', 'array'],
        ]);

        $operator = TelegramOperatorProfile::query()->create($data);

        return response()->json(['data' => $this->operatorPayload($operator->load('admin'))], 201);
    }

    public function updateOperator(Request $request, TelegramOperatorProfile $operator): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.operators.manage');

        $data = $request->validate([
            'admin_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'support_role' => ['sometimes', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'settings' => ['sometimes', 'nullable', 'array'],
        ]);

        $operator->update($data);

        return response()->json(['data' => $this->operatorPayload($operator->fresh()->load('admin'))]);
    }

    public function destroyOperator(Request $request, TelegramOperatorProfile $operator): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.operators.manage');

        $operator->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    private function categoryPayload(TelegramSupportCategory $category): array
    {
        return [
            'id' => $category->id,
            'key' => $category->key,
            'title_fa' => $category->title_fa,
            'default_topic_id' => $category->default_topic_id,
            'sort_order' => $category->sort_order,
            'is_active' => $category->is_active,
            'created_at' => $category->created_at?->toIso8601String(),
        ];
    }

    private function operatorPayload(TelegramOperatorProfile $operator): array
    {
        return [
            'id' => $operator->id,
            'telegram_user_id' => $operator->telegram_user_id,
            'admin_user_id' => $operator->admin_user_id,
            'admin_name' => $operator->admin?->name,
            'admin_email' => $operator->admin?->email,
            'display_name' => $operator->display_name,
            'support_role' => $operator->support_role,
            'is_active' => $operator->is_active,
            'settings' => $operator->settings ?? [],
            'created_at' => $operator->created_at?->toIso8601String(),
        ];
    }
}
