<?php

namespace App\Services\Family;

use App\Enums\AdminRoleName;
use App\Enums\UserStatus;
use App\Models\User;
use App\Services\AdminAuditLogger;
use App\Services\RolePermissionService;
use App\Support\Mobile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Root/super-admin CRUD for family-manager panel accounts (Flutter admin). */
final class FamilyManagerAdminService
{
    public function __construct(
        private readonly RolePermissionService $roles,
        private readonly AdminAuditLogger $audit,
    ) {}

    public function assertCanManage(User $actor): void
    {
        if ($actor->isRootAdmin() || $actor->isSuperAdmin()) {
            return;
        }

        abort(403, 'فقط مدیر کل می‌تواند مدیران خانواده را مدیریت کند.');
    }

    /** @return list<User> */
    public function list(): array
    {
        return User::query()
            ->where('is_admin', true)
            ->role(AdminRoleName::FamilyManager->value)
            ->with('roles')
            ->orderBy('name')
            ->get()
            ->all();
    }

    public function create(User $actor, string $name, string $email, string $mobile, string $password): User
    {
        $this->assertCanManage($actor);

        return $this->roles->createAdmin(
            $actor,
            $name,
            $email,
            $password,
            AdminRoleName::FamilyManager->value,
            $mobile,
        );
    }

    /** @param  array{name?: string, email?: string, mobile?: string}  $data */
    public function updateProfile(User $actor, User $admin, array $data): User
    {
        $this->assertCanManage($actor);
        $this->assertFamilyManagerTarget($admin);

        if ($admin->isRootAdmin()) {
            throw ValidationException::withMessages(['user' => ['مدیر اصلی سیستم قابل ویرایش نیست.']]);
        }

        $updates = [];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                throw ValidationException::withMessages(['name' => ['نام الزامی است.']]);
            }
            $updates['name'] = $name;
        }

        if (array_key_exists('email', $data)) {
            $email = trim((string) $data['email']);
            if ($email === '') {
                throw ValidationException::withMessages(['email' => ['ایمیل الزامی است.']]);
            }
            if (User::query()->where('email', $email)->whereKeyNot($admin->id)->exists()) {
                throw ValidationException::withMessages(['email' => ['این ایمیل قبلاً ثبت شده است.']]);
            }
            $updates['email'] = $email;
        }

        if (array_key_exists('mobile', $data)) {
            $normalized = Mobile::normalize((string) $data['mobile']);
            if (! $normalized) {
                throw ValidationException::withMessages(['mobile' => ['شماره موبایل معتبر نیست.']]);
            }
            if (User::query()->where('mobile', $normalized)->whereKeyNot($admin->id)->exists()) {
                throw ValidationException::withMessages(['mobile' => ['این شماره موبایل قبلاً ثبت شده است.']]);
            }
            $updates['mobile'] = $normalized;
            $updates['mobile_verified_at'] = now();
        }

        if ($updates === []) {
            return $admin;
        }

        $admin->update($updates);
        $this->audit->log($actor, 'family_manager_admin.updated', $admin, $updates);

        return $admin->fresh();
    }

    public function resetPassword(User $actor, User $admin, string $password): void
    {
        $this->assertCanManage($actor);
        $this->assertFamilyManagerTarget($admin);

        if ($admin->isRootAdmin()) {
            throw ValidationException::withMessages(['user' => ['رمز مدیر اصلی از اینجا قابل تغییر نیست.']]);
        }

        $admin->update(['password' => $password]);
        $admin->tokens()->delete();

        $this->audit->log($actor, 'family_manager_admin.password_reset', $admin, [
            'admin_id' => $admin->id,
        ]);
    }

    public function setStatus(User $actor, User $admin, UserStatus $status): User
    {
        $this->assertCanManage($actor);
        $this->assertFamilyManagerTarget($admin);

        if ($admin->isRootAdmin()) {
            throw ValidationException::withMessages(['user' => ['وضعیت مدیر اصلی قابل تغییر نیست.']]);
        }

        if ($admin->id === $actor->id) {
            throw ValidationException::withMessages(['user' => ['نمی‌توانید وضعیت حساب خود را تغییر دهید.']]);
        }

        DB::transaction(function () use ($actor, $admin, $status): void {
            $admin->update(['status' => $status]);

            if ($status !== UserStatus::Active) {
                $admin->tokens()->delete();
            }

            $this->audit->log($actor, 'family_manager_admin.status_changed', $admin, [
                'status' => $status->value,
            ]);
        });

        return $admin->fresh();
    }

    public function delete(User $actor, User $admin): void
    {
        $this->assertCanManage($actor);
        $this->assertFamilyManagerTarget($admin);
        $this->roles->deleteAdmin($actor, $admin);
    }

    private function assertFamilyManagerTarget(User $admin): void
    {
        if (! $admin->is_admin || ! $admin->hasRole(AdminRoleName::FamilyManager->value)) {
            throw ValidationException::withMessages(['user' => ['کاربر هدف مدیر خانواده نیست.']]);
        }
    }
}
