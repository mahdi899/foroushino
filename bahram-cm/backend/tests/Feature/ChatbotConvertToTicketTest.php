<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Models\ChatbotLog;
use App\Models\ChatbotSession;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatbotConvertToTicketTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create(['is_admin' => true]);
        $this->admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($this->admin, ['*']);
    }

    public function test_converts_session_to_ticket_for_registered_student(): void
    {
        $student = User::factory()->create([
            'is_admin' => false,
            'mobile' => '09121112233',
        ]);

        $sessionId = (string) Str::uuid();
        ChatbotSession::query()->create([
            'session_id' => $sessionId,
            'visitor_phone' => '09121112233',
            'visitor_first_name' => 'علی',
            'message_count' => 2,
            'open_count' => 1,
            'opened_at' => now(),
            'last_activity_at' => now(),
        ]);

        $pending = ChatbotLog::query()->create([
            'session_id' => $sessionId,
            'question' => 'مشکل در پرداخت دارم',
            'answer' => '—',
            'metadata' => [
                'event' => 'visitor_message',
                'pending_operator' => true,
            ],
        ]);

        $response = $this->postJson("/api/v1/panel/chatbot/sessions/{$sessionId}/convert-to-ticket", [
            'subject' => 'مشکل پرداخت',
            'department' => 'financial',
        ]);

        $response->assertCreated();
        $ticketId = (int) $response->json('data.ticket_id');
        $this->assertSame($student->id, (int) $response->json('data.student_id'));

        $this->assertDatabaseHas('tickets', [
            'id' => $ticketId,
            'user_id' => $student->id,
            'subject' => 'مشکل پرداخت',
            'department' => 'financial',
            'status' => 'waiting_user',
        ]);

        $this->assertDatabaseHas('ticket_messages', [
            'ticket_id' => $ticketId,
            'is_admin_reply' => true,
        ]);

        $this->assertDatabaseHas('chatbot_sessions', [
            'session_id' => $sessionId,
            'ticket_id' => $ticketId,
        ]);

        $pending->refresh();
        $this->assertFalse((bool) ($pending->metadata['pending_operator'] ?? true));

        $this->assertDatabaseHas('chatbot_logs', [
            'session_id' => $sessionId,
            'answer' => "گفتگو به تیکت پشتیبانی شماره {$ticketId} منتقل شد. لطفاً ادامهٔ پیگیری را از پنل پشتیبانی (بخش تیکت‌ها) انجام دهید.",
        ]);
    }

    public function test_rejects_when_visitor_phone_missing(): void
    {
        $sessionId = (string) Str::uuid();
        ChatbotSession::query()->create([
            'session_id' => $sessionId,
            'message_count' => 1,
            'open_count' => 1,
            'opened_at' => now(),
            'last_activity_at' => now(),
        ]);

        Sanctum::actingAs($this->admin, ['*']);

        $this->postJson("/api/v1/panel/chatbot/sessions/{$sessionId}/convert-to-ticket", [
            'subject' => 'عنوان',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'phone_required');

        $this->assertDatabaseCount('tickets', 0);
    }

    public function test_converts_with_manual_mobile_when_session_phone_missing(): void
    {
        $student = User::factory()->create([
            'is_admin' => false,
            'mobile' => '09124445566',
        ]);

        $sessionId = (string) Str::uuid();
        ChatbotSession::query()->create([
            'session_id' => $sessionId,
            'visitor_first_name' => 'علی',
            'message_count' => 1,
            'open_count' => 1,
            'opened_at' => now(),
            'last_activity_at' => now(),
        ]);

        Sanctum::actingAs($this->admin, ['*']);

        $response = $this->postJson("/api/v1/panel/chatbot/sessions/{$sessionId}/convert-to-ticket", [
            'subject' => 'پیگیری دستی',
            'mobile' => '09124445566',
        ]);

        $response->assertCreated();
        $ticketId = (int) $response->json('data.ticket_id');
        $this->assertSame($student->id, (int) $response->json('data.student_id'));

        $this->assertDatabaseHas('chatbot_sessions', [
            'session_id' => $sessionId,
            'visitor_phone' => '09124445566',
            'ticket_id' => $ticketId,
        ]);
    }

    public function test_rejects_when_student_not_registered(): void
    {
        $sessionId = (string) Str::uuid();
        ChatbotSession::query()->create([
            'session_id' => $sessionId,
            'visitor_phone' => '09129998877',
            'message_count' => 1,
            'open_count' => 1,
            'opened_at' => now(),
            'last_activity_at' => now(),
        ]);

        Sanctum::actingAs($this->admin, ['*']);

        $this->postJson("/api/v1/panel/chatbot/sessions/{$sessionId}/convert-to-ticket", [
            'subject' => 'عنوان',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'student_not_found');

        $this->assertDatabaseCount('tickets', 0);
    }

    public function test_rejects_duplicate_conversion(): void
    {
        $student = User::factory()->create([
            'is_admin' => false,
            'mobile' => '09123334455',
        ]);

        $ticket = Ticket::query()->create([
            'user_id' => $student->id,
            'subject' => 'قبلی',
            'status' => 'waiting_user',
            'priority' => 'normal',
        ]);

        $sessionId = (string) Str::uuid();
        ChatbotSession::query()->create([
            'session_id' => $sessionId,
            'visitor_phone' => '09123334455',
            'ticket_id' => $ticket->id,
            'converted_at' => now(),
            'message_count' => 1,
            'open_count' => 1,
            'opened_at' => now(),
            'last_activity_at' => now(),
        ]);

        Sanctum::actingAs($this->admin, ['*']);

        $this->postJson("/api/v1/panel/chatbot/sessions/{$sessionId}/convert-to-ticket", [
            'subject' => 'دوباره',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'already_converted');

        $this->assertDatabaseCount('tickets', 1);
    }

    public function test_requires_settings_manage_permission(): void
    {
        $support = User::factory()->create(['is_admin' => true]);
        $support->assignRole(AdminRoleName::Support->value);

        $sessionId = (string) Str::uuid();
        ChatbotSession::query()->create([
            'session_id' => $sessionId,
            'visitor_phone' => '09121112233',
            'message_count' => 1,
            'open_count' => 1,
            'opened_at' => now(),
            'last_activity_at' => now(),
        ]);

        Sanctum::actingAs($support, ['*']);

        $this->postJson("/api/v1/panel/chatbot/sessions/{$sessionId}/convert-to-ticket", [
            'subject' => 'عنوان',
        ])->assertForbidden();
    }
}
