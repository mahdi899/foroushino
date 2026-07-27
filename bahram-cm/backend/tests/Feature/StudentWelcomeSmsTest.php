<?php

namespace Tests\Feature;

use App\Enums\InAppNotificationType;
use App\Enums\SmsEventKey;
use App\Models\Notification as NotificationModel;
use App\Models\NotificationRecipient;
use App\Models\SmsEventConfig;
use App\Models\SmsLog;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Models\User;
use App\Services\InAppNotificationService;
use App\Services\SmsService;
use App\Services\StudentOnboardingService;
use Database\Seeders\SmsCenterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class StudentWelcomeSmsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SmsCenterSeeder::class);

        SmsProvider::query()->where('slug', 'kavenegar')->first()?->update([
            'is_active' => true,
            'credentials' => 'test-kavenegar-key',
            'sender_number' => '10001234',
        ]);

        SmsSetting::current()->update([
            'is_sms_active' => true,
            'primary_provider_slug' => 'kavenegar',
            'sms_provider' => 'kavenegar',
            'sms_api_key' => 'test-kavenegar-key',
            'sms_sender_number' => '10001234',
            'fallback_enabled' => false,
        ]);

        SmsEventConfig::forKey(SmsEventKey::Welcome)?->update([
            'is_enabled' => true,
            'fallback_enabled' => false,
        ]);
    }

    public function test_welcome_sms_and_notification_send_only_once_per_first_login(): void
    {
        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'ok'],
                'entries' => [],
            ], 200),
        ]);

        $user = User::factory()->create([
            'mobile' => '09121112233',
            'name' => 'علی',
            'first_login_at' => null,
        ]);

        $onboarding = app(StudentOnboardingService::class);
        $onboarding->handleFirstLogin($user);
        $onboarding->handleFirstLogin($user->fresh());
        $onboarding->handleFirstLogin($user->fresh());

        $this->assertSame(
            1,
            SmsLog::query()
                ->where('event_key', SmsEventKey::Welcome->value)
                ->where('mobile', '09121112233')
                ->where('status', 'sent')
                ->count(),
        );
        $this->assertSame(
            1,
            NotificationRecipient::query()
                ->where('user_id', $user->id)
                ->whereHas('notification', fn ($q) => $q->where('type', InAppNotificationType::Welcome->value))
                ->count(),
        );
        $this->assertNotNull($user->fresh()->first_login_at);
        Http::assertSentCount(1);
    }

    public function test_welcome_sms_never_resends_to_same_mobile(): void
    {
        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'ok'],
                'entries' => [],
            ], 200),
        ]);

        $user = User::factory()->create([
            'mobile' => '09124445566',
            'name' => 'سارا',
            'first_login_at' => null,
        ]);

        $sms = app(SmsService::class);
        $this->assertTrue($sms->sendWelcome($user));
        $this->assertFalse($sms->sendWelcome($user));
        $this->assertFalse($sms->sendWelcome($user));

        $this->assertSame(
            1,
            SmsLog::query()
                ->where('event_key', SmsEventKey::Welcome->value)
                ->where('mobile', '09124445566')
                ->where('status', 'sent')
                ->count(),
        );
        Http::assertSentCount(1);
    }

    public function test_welcome_notification_is_idempotent_and_purges_duplicates(): void
    {
        $user = User::factory()->create(['mobile' => '09127778899']);

        $service = app(InAppNotificationService::class);
        $first = $service->welcome($user);
        $second = $service->welcome($user);

        $this->assertSame($first->id, $second->id);

        // Simulate historical spam (5 welcome rows) then collapse on next list/welcome.
        for ($i = 0; $i < 4; $i++) {
            $n = NotificationModel::create([
                'title' => 'خوش‌آمد تکراری',
                'body' => 'تکراری',
                'type' => InAppNotificationType::Welcome->value,
            ]);
            NotificationRecipient::create([
                'notification_id' => $n->id,
                'user_id' => $user->id,
            ]);
        }

        $this->assertSame(
            5,
            NotificationRecipient::query()
                ->where('user_id', $user->id)
                ->whereHas('notification', fn ($q) => $q->where('type', InAppNotificationType::Welcome->value))
                ->count(),
        );

        $service->dedupeWelcomeNotifications($user);

        $this->assertSame(
            1,
            NotificationRecipient::query()
                ->where('user_id', $user->id)
                ->whereHas('notification', fn ($q) => $q->where('type', InAppNotificationType::Welcome->value))
                ->count(),
        );
        $this->assertTrue(
            NotificationRecipient::query()->whereKey($first->id)->exists(),
        );
    }
}
