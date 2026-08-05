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

    public function test_tech_roles_have_technical_ticket_queue_permission(): void
    {
        foreach ([AdminRoleName::TechSupport, AdminRoleName::TechManager] as $roleName) {
            $role = Role::findByName($roleName->value);
            $names = $role->permissions->pluck('name')->sort()->values()->all();

            $this->assertSame([
                'tickets.manage',
                'tickets.technical',
                'tickets.view',
            ], $names, $roleName->value);
        }
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
            ->assertJsonPath('data.department', 'technical')
            ->assertJsonPath('data.tech_escalation', 'tech_support');

        $this->assertDatabaseHas('tickets', [
            'id' => $ticket->id,
            'department' => 'technical',
            'tech_escalation' => 'tech_support',
        ]);

        $this->getJson('/api/v1/tickets?department=technical')
            ->assertOk()
            ->assertJsonFragment(['id' => $ticket->id]);
    }

    public function test_tech_escalation_flow_support_to_manager_to_resolve(): void
    {
        $techSupport = $this->makeAdmin(AdminRoleName::TechSupport);
        $techManager = $this->makeAdmin(AdminRoleName::TechManager);
        $support = $this->makeAdmin(AdminRoleName::Support);
        $student = User::factory()->create([
            'is_admin' => false,
            'mobile' => '09121113344',
        ]);

        $ticket = Ticket::query()->create([
            'user_id' => $student->id,
            'department' => 'technical',
            'tech_escalation' => 'tech_support',
            'subject' => 'باگ فنی',
            'status' => TicketStatus::Open,
            'priority' => TicketPriority::Normal,
        ]);

        Sanctum::actingAs($techSupport, ['*']);
        $this->patchJson("/api/v1/tickets/{$ticket->id}", [
            'tech_escalation' => 'tech_manager',
        ])
            ->assertOk()
            ->assertJsonPath('data.tech_escalation', 'tech_manager');

        Sanctum::actingAs($support, ['*']);
        $this->patchJson("/api/v1/tickets/{$ticket->id}", [
            'tech_escalation' => 'resolved',
        ])->assertForbidden();

        Sanctum::actingAs($techManager, ['*']);
        $this->patchJson("/api/v1/tickets/{$ticket->id}", [
            'tech_escalation' => 'resolved',
        ])
            ->assertOk()
            ->assertJsonPath('data.tech_escalation', 'resolved')
            ->assertJsonPath('data.tech_resolved_by', $techManager->id);

        Sanctum::actingAs($support, ['*']);
        $this->getJson('/api/v1/tickets?tech_escalation=resolved')
            ->assertOk()
            ->assertJsonFragment(['id' => $ticket->id]);
    }

    public function test_tech_support_cannot_escalate_directly_to_super_admin(): void
    {
        $techSupport = $this->makeAdmin(AdminRoleName::TechSupport);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121114455']);
        $ticket = Ticket::query()->create([
            'user_id' => $student->id,
            'department' => 'technical',
            'tech_escalation' => 'tech_support',
            'subject' => 'ارجاع مستقیم',
            'status' => TicketStatus::Open,
            'priority' => TicketPriority::Normal,
        ]);

        Sanctum::actingAs($techSupport, ['*']);
        $this->patchJson("/api/v1/tickets/{$ticket->id}", [
            'tech_escalation' => 'super_admin',
        ])->assertForbidden();
    }

    public function test_tech_support_can_only_post_internal_notes(): void
    {
        $techSupport = $this->makeAdmin(AdminRoleName::TechSupport);
        $support = $this->makeAdmin(AdminRoleName::Support);
        $student = User::factory()->create([
            'is_admin' => false,
            'mobile' => '09121115566',
            'name' => 'دانشجو داخلی',
        ]);

        $ticket = Ticket::query()->create([
            'user_id' => $student->id,
            'department' => 'technical',
            'tech_escalation' => 'tech_support',
            'subject' => 'مشکل فنی برای پیام داخلی',
            'status' => TicketStatus::Open,
            'priority' => TicketPriority::Normal,
        ]);
        $ticket->messages()->create([
            'user_id' => $student->id,
            'message' => 'اپ باز نمی‌شود',
            'is_admin_reply' => false,
            'is_internal' => false,
        ]);

        Sanctum::actingAs($techSupport, ['*']);

        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'message' => 'لاگ سرور را چک کردم؛ کش را پاک کنید',
        ])
            ->assertOk();

        $this->assertDatabaseHas('ticket_messages', [
            'ticket_id' => $ticket->id,
            'message' => 'لاگ سرور را چک کردم؛ کش را پاک کنید',
            'is_admin_reply' => true,
            'is_internal' => true,
            'user_id' => $techSupport->id,
        ]);

        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'message' => 'نباید به کاربر برسد',
            'is_internal' => false,
        ])
            ->assertOk();

        $this->assertDatabaseHas('ticket_messages', [
            'ticket_id' => $ticket->id,
            'message' => 'نباید به کاربر برسد',
            'is_internal' => true,
        ]);

        Sanctum::actingAs($support, ['*']);
        $detail = $this->getJson("/api/v1/tickets/{$ticket->id}")
            ->assertOk()
            ->json('data');

        $this->assertTrue(collect($detail['messages'])->contains(
            fn ($m) => ($m['message'] ?? '') === 'لاگ سرور را چک کردم؛ کش را پاک کنید' && ($m['is_internal'] ?? false) === true
        ));
        $this->assertTrue($detail['can_reply_to_user']);
        $this->assertFalse($detail['must_use_internal']);

        // مخاطب نباید پیام‌های داخلی را در لود رابطهٔ عمومی ببیند
        $publicCount = $ticket->messages()->where('is_internal', false)->count();
        $internalCount = $ticket->messages()->where('is_internal', true)->count();
        $this->assertSame(1, $publicCount);
        $this->assertGreaterThanOrEqual(2, $internalCount);
    }

    public function test_support_can_send_public_and_internal_messages(): void
    {
        $support = $this->makeAdmin(AdminRoleName::Support);
        $student = User::factory()->create([
            'is_admin' => false,
            'mobile' => '09121116677',
        ]);

        $ticket = Ticket::query()->create([
            'user_id' => $student->id,
            'department' => null,
            'subject' => 'سؤال عمومی',
            'status' => TicketStatus::Open,
            'priority' => TicketPriority::Normal,
        ]);

        Sanctum::actingAs($support, ['*']);

        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'message' => 'یادداشت برای تیم فنی',
            'is_internal' => true,
        ])->assertOk();

        $this->assertDatabaseHas('ticket_messages', [
            'ticket_id' => $ticket->id,
            'message' => 'یادداشت برای تیم فنی',
            'is_internal' => true,
        ]);

        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'message' => 'پاسخ نهایی برای شما',
            'is_internal' => false,
        ])->assertOk();

        $this->assertDatabaseHas('ticket_messages', [
            'ticket_id' => $ticket->id,
            'message' => 'پاسخ نهایی برای شما',
            'is_admin_reply' => true,
            'is_internal' => false,
        ]);
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
