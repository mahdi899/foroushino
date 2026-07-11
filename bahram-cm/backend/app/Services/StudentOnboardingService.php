<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Handles the student's first entry into /panel: recording first_login_at,
 * sending a one-time welcome (SMS + in-app notification), and computing the
 * onboarding checklist shown on the dashboard.
 */
class StudentOnboardingService
{
    private const CLICK_TRACKED_STEPS = ['telegram_channel', 'rubika_channel', 'telegram_bot', 'customer_club'];

    public function __construct(
        private readonly SmsService $sms,
        private readonly InAppNotificationService $notifications,
        private readonly AdminTelegramLogService $adminTelegram,
    ) {}

    /** Idempotent: only fires side effects the very first time. */
    public function handleFirstLogin(User $user): void
    {
        if ($user->first_login_at !== null) {
            return;
        }

        DB::transaction(function () use ($user) {
            $user->refresh();
            if ($user->first_login_at !== null) {
                return;
            }

            $user->update(['first_login_at' => now()]);

            app(\App\Actions\Identity\EnsureIdentityProfile::class)($user);

            $this->notifications->welcome($user);
        });

        $this->adminTelegram->notifyStudentFirstLogin($user->fresh());

        if (filled($user->mobile)) {
            $this->sms->sendWelcome($user);
        }
    }

    public function markStepDone(User $user, string $step): void
    {
        if (! in_array($step, self::CLICK_TRACKED_STEPS, true)) {
            return;
        }

        $progress = $user->onboarding_progress ?? [];
        $progress[$step] = true;
        $user->update(['onboarding_progress' => $progress]);
    }

    /** @return array<int, array{key: string, label: string, done: bool, url: ?string}> */
    public function checklist(User $user): array
    {
        $progress = $user->onboarding_progress ?? [];
        $profile = $user->profile;
        $identity = $user->identityProfile;
        $links = $this->academyLinks();

        $hasLegalName = (filled($identity?->first_name) && filled($identity?->last_name))
            || (filled($profile?->first_name) && filled($profile?->last_name));

        return [
            [
                'key' => 'profile',
                'label' => 'تکمیل پروفایل',
                'done' => $hasLegalName,
                'url' => '/panel/profile',
            ],
            [
                'key' => 'telegram_channel',
                'label' => 'عضویت در کانال تلگرام',
                'done' => (bool) ($progress['telegram_channel'] ?? false),
                'url' => $links['telegram_channel'] ?? null,
            ],
            [
                'key' => 'rubika_channel',
                'label' => 'عضویت در روبیکا',
                'done' => (bool) ($progress['rubika_channel'] ?? false),
                'url' => $links['rubika_channel'] ?? null,
            ],
            [
                'key' => 'telegram_bot',
                'label' => 'ورود به ربات تلگرام',
                'done' => (bool) ($progress['telegram_bot'] ?? false),
                'url' => $links['telegram_bot'] ?? null,
            ],
            [
                'key' => 'course',
                'label' => 'مشاهده دوره',
                'done' => $user->courseAccesses()->exists(),
                'url' => '/panel/courses',
            ],
            [
                'key' => 'customer_club',
                'label' => 'مشاهده باشگاه مشتریان',
                'done' => (bool) ($progress['customer_club'] ?? false),
                'url' => '/panel/referrals',
            ],
            [
                'key' => 'sat',
                'label' => 'ثبت درخواست سات',
                'done' => $user->satApplications()->exists(),
                'url' => '/panel/sat',
            ],
        ];
    }

    /** @return array<string, ?string> */
    private function academyLinks(): array
    {
        return Setting::query()
            ->where('group', 'links')
            ->get()
            ->mapWithKeys(fn (Setting $s) => [$s->key => $s->value['url'] ?? null])
            ->all();
    }
}
