<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SupportAndKycRoleScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_kyc_operator_permissions_are_identity_only(): void
    {
        $role = Role::findByName(AdminRoleName::KycOperator->value);
        $names = $role->permissions->pluck('name')->sort()->values()->all();

        $this->assertSame([
            'identity.approve',
            'identity.reject',
            'identity.request_correction',
            'identity.reset',
            'identity.review',
            'identity.unlock_ownership_verification',
            'identity.view',
            'identity.view_national_code',
            'identity.view_sensitive_documents',
        ], $names);
    }

    public function test_support_permissions_are_tickets_only(): void
    {
        $role = Role::findByName(AdminRoleName::Support->value);
        $names = $role->permissions->pluck('name')->sort()->values()->all();

        $this->assertSame([
            'tickets.manage',
            'tickets.view',
        ], $names);
    }

    public function test_kyc_operator_cannot_access_tickets_or_students(): void
    {
        $operator = $this->makeAdmin(AdminRoleName::KycOperator);
        Sanctum::actingAs($operator, ['*']);

        $this->assertFalse($operator->hasPermission('students.view'));
        $this->assertFalse($operator->hasPermission('tickets.view'));

        $this->getJson('/api/v1/tickets')->assertForbidden();
        $this->getJson('/api/v1/students')->assertForbidden();
    }

    public function test_support_can_list_reply_and_mark_ticket_technical(): void
    {
        $support = $this->makeAdmin(AdminRoleName::Support);
        $student = User::factory()->create([
            'is_admin' => false,
            'mobile' => '09121112233',
            'name' => 'دانشجو تیکت',
        ]);

        $ticket = Ticket::query()->create([
            'user_id' => $student->id,
            'department' => null,
            'subject' => 'مشکل دسترسی',
            'status' => TicketStatus::Open,
            'priority' => TicketPriority::Normal,
        ]);
        $ticket->messages()->create([
            'user_id' => $student->id,
            'message' => 'سلام، کمک لازم دارم',
            'is_admin_reply' => false,
        ]);

        Sanctum::actingAs($support, ['*']);

        $this->getJson('/api/v1/tickets')
            ->assertOk()
            ->assertJsonFragment(['id' => $ticket->id]);

        $this->getJson('/api/v1/students')->assertForbidden();
        $this->getJson('/api/v1/identity-verifications')->assertForbidden();

        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'message' => 'در حال بررسی هستیم',
        ])->assertOk();

        $this->patchJson("/api/v1/tickets/{$ticket->id}", [
            'department' => 'technical',
        ])
            ->assertOk()
            ->assertJsonPath('data.department', 'technical');

        $this->assertDatabaseHas('tickets', [
            'id' => $ticket->id,
            'department' => 'technical',
        ]);

        $this->getJson('/api/v1/tickets?department=technical')
            ->assertOk()
            ->assertJsonFragment(['id' => $ticket->id]);
    }

    public function test_admin_without_ticket_permission_is_forbidden(): void
    {
        $content = $this->makeAdmin(AdminRoleName::ContentManager);
        Sanctum::actingAs($content, ['*']);

        $this->getJson('/api/v1/tickets')->assertForbidden();
        $this->postJson('/api/v1/tickets', [
            'mobile' => '09121112233',
            'subject' => 'تست',
            'message' => 'پیام',
        ])->assertForbidden();
    }

    private function makeAdmin(AdminRoleName $role): User
    {
        $user = User::factory()->create([
            'email' => Str::uuid().'@bahram.test',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);
        $user->assignRole($role->value);

        return $user;
    }
}
