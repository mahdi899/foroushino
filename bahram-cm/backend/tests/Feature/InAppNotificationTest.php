<?php

namespace Tests\Feature;

use App\Enums\InAppNotificationType;
use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Models\Order;
use App\Models\Product;
use App\Models\Ticket;
use App\Models\User;
use App\Services\InAppNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InAppNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_paid_creates_in_app_notification(): void
    {
        $user = User::factory()->create(['mobile' => '09121112233', 'is_admin' => false]);
        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 100000,
            'is_active' => true,
        ]);
        $order = Order::create([
            'order_number' => 'BC-100',
            'product_id' => $product->id,
            'user_id' => $user->id,
            'customer_name' => 'دانشجو',
            'customer_phone' => '09121112233',
            'amount' => 100000,
            'discount_amount' => 0,
            'final_amount' => 100000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        app(InAppNotificationService::class)->orderPaid($order);

        $this->assertDatabaseHas('notifications', [
            'type' => InAppNotificationType::OrderPaid->value,
            'link' => '/panel/orders',
        ]);
        $this->assertDatabaseHas('notification_recipients', [
            'user_id' => $user->id,
            'read_at' => null,
        ]);
    }

    public function test_ticket_reply_creates_in_app_notification(): void
    {
        $user = User::factory()->create(['mobile' => '09123334444', 'is_admin' => false]);
        $ticket = Ticket::create([
            'user_id' => $user->id,
            'subject' => 'مشکل پخش',
            'status' => 'open',
            'priority' => 'normal',
        ]);

        app(InAppNotificationService::class)->ticketReply($ticket);

        $this->assertDatabaseHas('notifications', [
            'type' => InAppNotificationType::TicketReply->value,
        ]);
    }

    public function test_student_can_list_notifications_and_unread_count(): void
    {
        $user = User::factory()->create(['mobile' => '09125556666', 'is_admin' => false]);
        $notification = Notification::create([
            'title' => 'تست',
            'body' => 'متن تست',
            'type' => InAppNotificationType::General->value,
            'link' => '/panel',
        ]);
        NotificationRecipient::create(['notification_id' => $notification->id, 'user_id' => $user->id]);

        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/student/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'تست')
            ->assertJsonPath('meta.total', 1);

        $this->withToken($token)
            ->getJson('/api/v1/student/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 1);
    }

    public function test_student_can_list_unread_notifications_only(): void
    {
        $user = User::factory()->create(['mobile' => '09126667777', 'is_admin' => false]);
        $readNotification = Notification::create([
            'title' => 'خوانده‌شده',
            'body' => 'متن',
            'type' => InAppNotificationType::General->value,
        ]);
        $unreadNotification = Notification::create([
            'title' => 'خوانده‌نشده',
            'body' => 'متن',
            'type' => InAppNotificationType::General->value,
        ]);
        NotificationRecipient::create([
            'notification_id' => $readNotification->id,
            'user_id' => $user->id,
            'read_at' => now(),
        ]);
        NotificationRecipient::create([
            'notification_id' => $unreadNotification->id,
            'user_id' => $user->id,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/student/notifications?unread_only=1')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'خوانده‌نشده')
            ->assertJsonPath('meta.total', 1);
    }

    public function test_student_can_mark_notification_as_read(): void
    {
        $user = User::factory()->create(['mobile' => '09127778888', 'is_admin' => false]);
        $notification = Notification::create([
            'title' => 'خواندن',
            'body' => 'متن',
            'type' => InAppNotificationType::General->value,
        ]);
        $recipient = NotificationRecipient::create([
            'notification_id' => $notification->id,
            'user_id' => $user->id,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson("/api/v1/student/notifications/{$recipient->id}/read")
            ->assertOk()
            ->assertJsonStructure(['data' => ['read_at']]);

        $this->assertNotNull($recipient->fresh()->read_at);
    }

    public function test_student_can_mark_all_notifications_as_read(): void
    {
        $user = User::factory()->create(['mobile' => '09128889999', 'is_admin' => false]);
        $notificationA = Notification::create([
            'title' => 'اول',
            'body' => 'متن',
            'type' => InAppNotificationType::General->value,
        ]);
        $notificationB = Notification::create([
            'title' => 'دوم',
            'body' => 'متن',
            'type' => InAppNotificationType::General->value,
        ]);
        NotificationRecipient::create(['notification_id' => $notificationA->id, 'user_id' => $user->id]);
        NotificationRecipient::create(['notification_id' => $notificationB->id, 'user_id' => $user->id]);

        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/student/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.marked_count', 2);

        $this->assertEquals(0, $user->notificationRecipients()->whereNull('read_at')->count());
    }
}
