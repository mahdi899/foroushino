<?php

namespace Tests\Feature\Telegram;

use App\Models\User;
use App\Modules\TelegramBot\Models\NotificationOutbox;
use App\Modules\TelegramBot\Services\NotificationOutboxWriter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class OutboxWriteTest extends TestCase
{
    use RefreshDatabase;

    public function test_writes_outbox_idempotently(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $writer = app(NotificationOutboxWriter::class);

        $first = $writer->write('order_paid', $user->id, ['text' => 'hi'], ['telegram'], 'order_paid:1');
        $second = $writer->write('order_paid', $user->id, ['text' => 'hi'], ['telegram'], 'order_paid:1');

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertSame(1, NotificationOutbox::query()->count());
    }
}
