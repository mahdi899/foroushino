<?php

namespace Tests\Unit;

use App\Enums\AdminRoleName;
use App\Models\User;
use App\Services\RolePermissionService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RolePermissionServiceAssignTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_non_super_admin_cannot_assign_super_admin_role(): void
    {
        $actor = User::factory()->create([
            'email' => Str::uuid().'@bahram.test',
            'is_admin' => true,
        ]);
        $actor->assignRole(AdminRoleName::Admin->value);
        Role::findByName(AdminRoleName::Admin->value)->givePermissionTo('admins.assign_role');
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $actor = $actor->fresh();

        $target = User::factory()->create([
            'email' => Str::uuid().'@bahram.test',
            'is_admin' => true,
        ]);
        $target->assignRole(AdminRoleName::Support->value);

        $this->assertTrue($actor->hasPermission('admins.assign_role'));
        $this->assertFalse($actor->isSuperAdmin());

        try {
            app(RolePermissionService::class)->assignRoleToAdmin(
                $actor,
                $target,
                AdminRoleName::SuperAdmin->value,
            );
            $this->fail('Expected ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame(
                'فقط مدیر کل می‌تواند نقش مدیر کل را اختصاص دهد.',
                $e->errors()['roles'][0] ?? null,
            );
        }

        $this->assertFalse($target->fresh()->isSuperAdmin());
        $this->assertTrue($target->fresh()->hasRole(AdminRoleName::Support->value));
    }

    public function test_assign_multiple_roles_to_admin(): void
    {
        $actor = User::factory()->create([
            'email' => Str::uuid().'@bahram.test',
            'is_admin' => true,
        ]);
        $actor->assignRole(AdminRoleName::SuperAdmin->value);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $actor = $actor->fresh();

        $target = User::factory()->create([
            'email' => Str::uuid().'@bahram.test',
            'is_admin' => true,
        ]);
        $target->assignRole(AdminRoleName::Support->value);

        app(RolePermissionService::class)->assignRolesToAdmin(
            $actor,
            $target,
            [AdminRoleName::Admin->value, AdminRoleName::ReadOnly->value],
        );

        $fresh = $target->fresh();
        $this->assertTrue($fresh->hasRole(AdminRoleName::Admin->value));
        $this->assertTrue($fresh->hasRole(AdminRoleName::ReadOnly->value));
        $this->assertFalse($fresh->hasRole(AdminRoleName::Support->value));
    }

    public function test_non_super_admin_cannot_create_super_admin(): void
    {
        $actor = User::factory()->create([
            'email' => Str::uuid().'@bahram.test',
            'is_admin' => true,
        ]);
        $actor->assignRole(AdminRoleName::Admin->value);
        Role::findByName(AdminRoleName::Admin->value)->givePermissionTo('admins.create');
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $actor = $actor->fresh();

        try {
            app(RolePermissionService::class)->createAdmin(
                $actor,
                'مدیر کل جدید',
                'blocked-super@bahram.test',
                'password12345',
                AdminRoleName::SuperAdmin->value,
                '09121234569',
            );
            $this->fail('Expected ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame(
                'فقط مدیر کل می‌تواند مدیر کل جدید بسازد.',
                $e->errors()['role'][0] ?? null,
            );
        }

        $this->assertNull(User::query()->where('email', 'blocked-super@bahram.test')->first());
    }
}
