<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreUserRequest;
use App\Http\Requests\V1\Admin\UpdateUserRequest;
use App\Http\Resources\V1\TeamAdminResource;
use App\Http\Resources\V1\UserAdminResource;
use App\Models\Team;
use App\Models\User;
use App\Enums\RoleName;
use App\Services\WalletService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);

        $query = User::query()->with('team')->orderBy('name');
        $user = $request->user();

        if ($user && ! $user->can('users.manage') && ! $user->can('users.manage-team') && $user->team_id) {
            $query->where('team_id', $user->team_id);
        }

        return ApiResponse::success(UserAdminResource::collection($query->get()));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $phone = preg_replace('/\D/', '', $validated['phone']) ?? $validated['phone'];

        $user = User::query()->create([
            'name' => $validated['name'],
            'phone' => $phone,
            'email' => $validated['email'] ?? "{$phone}@saat.local",
            'password' => bcrypt(Str::random(32)),
            'team_id' => $validated['team_id'],
            'is_active' => true,
        ]);
        $user->assignRole(RoleName::Agent->value);
        app(WalletService::class)->ensureWallet($user);

        return ApiResponse::success(new UserAdminResource($user->fresh('team')), 'کارشناس اضافه شد', status: 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        abort_unless($user->hasRole(RoleName::Agent->value), 422, 'فقط کارشناس قابل ویرایش است.');

        $validated = collect($request->validated())->except(['confirm_bank_card'])->all();
        $user->fill($validated);

        if ($request->has('bank_card')) {
            $user->bank_card_confirmed_at = null;
        }

        if ($request->boolean('confirm_bank_card')) {
            abort_unless($user->bank_card, 422, 'برای تایید کارت، ابتدا شماره کارت را ثبت کن.');
            abort_unless($user->bank_sheba, 422, 'برای تایید، ابتدا شماره شبا را ثبت کن.');
            $user->bank_card_confirmed_at = now();
        }

        $user->save();

        return ApiResponse::success(new UserAdminResource($user->fresh('team')), 'کاربر به‌روزرسانی شد');
    }

    private function authorizeView(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('users.view'), 403, 'اجازه دسترسی ندارید.');
    }
}
