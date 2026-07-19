<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreUserRequest;
use App\Http\Requests\V1\Admin\UpdateUserRequest;
use App\Http\Resources\V1\UserAdminResource;
use App\Models\Team;
use App\Models\User;
use App\Services\Admin\AgentAdminStats;
use App\Services\Admin\AdminDirectoryCache;
use App\Services\WalletService;
use App\Support\AdminScope;
use App\Support\ApiResponse;
use App\Support\PhoneNormalizer;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);
        $user = $request->user();
        abort_unless($user, 401);

        $users = AdminDirectoryCache::rememberUsers($user, function () use ($request, $user) {
            $query = User::query()->with(['team', 'roles'])->orderBy('name');

            if (! TeamScope::isOrgWide($user)) {
                $teamIds = TeamScope::supervisedTeamIds($user);

                if ($user->hasRole(RoleName::Leader->value) && $user->can('users.manage-team-roster')) {
                    $query->where(function ($q) use ($teamIds): void {
                        $q->whereIn('team_id', $teamIds)
                            ->orWhereNull('team_id');
                    })->role(RoleName::Agent->value);
                } elseif ($teamIds !== []) {
                    $leaderIds = Team::query()->whereIn('id', $teamIds)->pluck('leader_id')->filter()->all();
                    $query->where(function ($q) use ($teamIds, $leaderIds): void {
                        $q->whereIn('team_id', $teamIds);
                        if ($leaderIds !== []) {
                            $q->orWhereIn('id', $leaderIds);
                        }
                    });
                } elseif ($user->team_id) {
                    $query->where('team_id', $user->team_id);
                }
            }

            $users = $query->get();
            AgentAdminStats::attach($users);

            return UserAdminResource::collection($users)->resolve();
        });

        return ApiResponse::success($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $role = $validated['role'] ?? RoleName::Agent->value;
        $phone = PhoneNormalizer::normalize($validated['phone']);
        $teamId = $validated['team_id'] ?? null;
        $orgWideRole = in_array($role, [
            RoleName::SuperAdmin->value,
            RoleName::Admin->value,
            RoleName::Manager->value,
        ], true);
        $passwordLoginRole = in_array($role, RoleName::passwordLoginAtCreationValues(), true);

        $user = User::query()->create([
            'name' => $validated['name'],
            'phone' => $phone,
            'email' => $validated['email'] ?? "{$phone}@saat.local",
            'password' => bcrypt($validated['password']),
            'email_verified_at' => $orgWideRole ? now() : null,
            'phone_otp_exempt' => $passwordLoginRole,
            'team_id' => in_array($role, [RoleName::Agent->value, RoleName::Leader->value], true) ? $teamId : null,
            'is_active' => true,
        ]);
        $user->assignRole($role);

        if (in_array($role, [RoleName::Agent->value, RoleName::Leader->value, RoleName::Supervisor->value, RoleName::Manager->value, RoleName::Admin->value, RoleName::SuperAdmin->value], true)) {
            app(WalletService::class)->ensureWallet($user);
        }

        if ($role === RoleName::Leader->value && $teamId) {
            Team::query()->whereKey($teamId)->update(['leader_id' => $user->id]);
        }

        $fresh = $user->fresh(['team', 'roles']);
        AgentAdminStats::attach(collect([$fresh]));
        AdminDirectoryCache::bump();

        $message = match ($role) {
            RoleName::SuperAdmin->value => 'مدیر کل اضافه شد',
            RoleName::Admin->value, RoleName::Manager->value => 'مدیر اضافه شد',
            RoleName::Supervisor->value => 'ناظر اضافه شد',
            RoleName::Leader->value => 'سرتیم اضافه شد',
            default => 'کارشناس اضافه شد',
        };

        return ApiResponse::success(new UserAdminResource($fresh), $message, status: 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $actor = $request->user();
        $canEdit = AdminScope::canManageUser($actor, $user);
        if (! $canEdit && $actor?->can('users.manage-team-roster') && $user->hasRole(RoleName::Agent->value)) {
            $targetTeamId = $request->has('team_id')
                ? (int) $request->integer('team_id')
                : (int) ($user->team_id ?? 0);
            $canEdit = AdminScope::canManageTeamRoster($actor, $targetTeamId);
        }
        abort_unless($canEdit, 403, 'اجازه ویرایش این کاربر را ندارید.');

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

        if ($user->hasRole(RoleName::Leader->value) && $user->team_id) {
            Team::query()
                ->where('leader_id', $user->id)
                ->where('id', '!=', $user->team_id)
                ->update(['leader_id' => null]);
            Team::query()->whereKey($user->team_id)->update(['leader_id' => $user->id]);
        }

        $fresh = $user->fresh(['team', 'roles']);
        AgentAdminStats::attach(collect([$fresh]));
        AdminDirectoryCache::bump();

        return ApiResponse::success(new UserAdminResource($fresh), 'کاربر به‌روزرسانی شد');
    }

    private function authorizeView(Request $request): void
    {
        abort_unless(
            $request->user()?->can('users.view') || $request->user()?->can('users.manage-team-roster'),
            403,
            'اجازه دسترسی ندارید.',
        );
    }
}
