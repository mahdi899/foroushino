<?php

namespace App\Http\Controllers\Api\V1\Sat;

use App\Enums\SatRoleName;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Sat\SatAccessService;
use App\Support\ApiResponse;
use App\Support\Mobile;
use App\Support\SatPermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class StaffController extends Controller
{
    public function __construct(private readonly SatAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->hasSatPermission($actor, 'sat.staff.view'), 403);

        $query = User::query()
            ->where('is_sat_staff', true)
            ->with('satLeader:id,name')
            ->orderBy('name');

        if ($this->access->primaryRole($actor) === SatRoleName::Leader) {
            $teamIds = array_merge([$actor->id], $this->access->teamMemberIds($actor));
            $query->whereIn('id', $teamIds);
        }

        $staff = $query->get()->map(fn (User $user) => $this->staffPayload($user));

        return ApiResponse::success(['staff' => $staff]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'mobile' => ['required', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in([
                SatRoleName::Specialist->value,
                SatRoleName::Leader->value,
                SatRoleName::Management->value,
            ])],
            'sat_leader_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $role = SatRoleName::from($data['role']);
        abort_unless($this->access->canAssignRole($actor, $role), 403);

        if ($role === SatRoleName::Specialist && empty($data['sat_leader_id'])) {
            return ApiResponse::error('leader_required', 'برای کارشناس باید لیدر مشخص شود.', 422);
        }

        $mobile = Mobile::normalize($data['mobile']);
        if (! $mobile) {
            return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
        }

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'mobile' => $mobile,
            'password' => Hash::make($data['password']),
            'is_admin' => false,
            'is_sat_staff' => true,
            'sat_leader_id' => $role === SatRoleName::Specialist ? $data['sat_leader_id'] : null,
            'status' => 'active',
        ]);

        $user->assignRole(Role::findByName($role->value, SatPermissionCatalog::GUARD));

        return ApiResponse::success(['staff' => $this->staffPayload($user->fresh())], 201);
    }

    public function update(Request $request, User $staff): JsonResponse
    {
        $actor = $request->user();
        abort_unless($staff->is_sat_staff, 404);
        abort_unless($this->access->canManageStaff($actor, $staff), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'mobile' => ['sometimes', 'string', 'max:20'],
            'status' => ['sometimes', Rule::in(['active', 'suspended', 'blocked'])],
            'sat_leader_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'password' => ['sometimes', 'string', 'min:8'],
        ]);

        if (isset($data['mobile'])) {
            $mobile = Mobile::normalize($data['mobile']);
            if (! $mobile) {
                return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
            }
            $data['mobile'] = $mobile;
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $staff->update($data);

        return ApiResponse::success(['staff' => $this->staffPayload($staff->fresh())]);
    }

    /** @return array<string, mixed> */
    private function staffPayload(User $user): array
    {
        $role = $this->access->primaryRole($user);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'status' => $user->status?->value ?? $user->status,
            'role' => $role?->value,
            'role_label' => $role?->label(),
            'sat_leader_id' => $user->sat_leader_id,
            'sat_leader_name' => $user->satLeader?->name,
        ];
    }
}
