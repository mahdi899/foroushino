<?php

namespace Database\Seeders;

use App\Actions\Family\JoinFamily;
use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Family\FamilyPostPublisher;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class FamilySeeder extends Seeder
{
    private const DEMO_MEMBER_MOBILE = '09145416413';

    private const DEMO_MEMBER_PASSWORD = '12345';

    /** @var list<array{type: string, text: string, important: bool}> */
    private const DEMO_POSTS = [
        [
            'type' => 'text',
            'text' => 'سلام خانواده! من بهرام هستم. خوشحالم که اینجا هستید — از امروز هر هفته اینجا با هم حرف می‌زنیم و مسیر رشد را جلو می‌بریم.',
            'important' => true,
        ],
        [
            'type' => 'text',
            'text' => 'یادتون باشه: پیشرفت واقعی از اقدام کوچک و مداوم شروع می‌شه. این هفته یک کار کوچک انتخاب کنید و انجامش بدید — بعد توی کامنت‌ها برام بنویسید.',
            'important' => false,
        ],
        [
            'type' => 'text',
            'text' => 'امروز می‌خوام درباره «تمرکز» حرف بزنم. وقتی ذهنت شلوغه، یک کار را انتخاب کن و فقط همان را تا آخر انجام بده. ساده به نظر می‌رسد، ولی نتیجه‌اش عجیب است.',
            'important' => false,
        ],
        [
            'type' => 'text',
            'text' => 'سؤال این هفته: بزرگ‌ترین چالشی که الان توی کسب‌وکارت یا مسیر رشدت داری چیه؟ توی کامنت‌ها بنویس — من و بقیه خانواده کنارت هستیم.',
            'important' => true,
        ],
    ];

    public function run(): void
    {
        $member = $this->seedDemoMember();
        $author = $this->resolveBahramAuthor();

        $this->seedDemoPosts($author, $member);
    }

    private function seedDemoMember(): User
    {
        $member = User::query()->updateOrCreate(
            ['mobile' => self::DEMO_MEMBER_MOBILE],
            [
                'name' => 'عضو تست خانواده',
                'password' => Hash::make(self::DEMO_MEMBER_PASSWORD),
                'status' => 'active',
                'is_admin' => false,
                'is_sat_staff' => false,
                'mobile_verified_at' => now(),
            ]
        );

        $this->ensureIdentityProfile($member);

        $membership = app(JoinFamily::class)($member);

        if (! $membership->onboarding_completed) {
            $membership->update([
                'onboarding_completed' => true,
                'onboarding_completed_at' => now(),
            ]);
        }

        return $member;
    }

    private function ensureIdentityProfile(User $user): void
    {
        UserIdentityProfile::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'uuid' => (string) Str::uuid(),
                'identity_status' => IdentityVerificationStatus::NotStarted,
                'verification_level' => 1,
                'mobile_ownership_status' => MobileOwnershipStatus::NotStarted,
                'ownership_failed_attempts' => 0,
            ]
        );
    }

    private function resolveBahramAuthor(): User
    {
        $author = User::query()
            ->where('email', 'admin@bahram.local')
            ->where('is_admin', true)
            ->first();

        if (! $author) {
            throw new \RuntimeException('کاربر ادمین (admin@bahram.local) یافت نشد. ابتدا DatabaseSeeder را اجرا کنید.');
        }

        return $author;
    }

    private function seedDemoPosts(User $author, User $member): void
    {
        /** @var FamilyPostPublisher $publisher */
        $publisher = app(FamilyPostPublisher::class);

        foreach (self::DEMO_POSTS as $payload) {
            $exists = FamilyPost::query()
                ->where('author_id', $author->id)
                ->where('status', FamilyPostStatus::Published->value)
                ->whereHas('blocks', fn ($q) => $q->where('text_content', $payload['text']))
                ->exists();

            if ($exists) {
                continue;
            }

            $post = $publisher->createDraft($author, [
                'type' => $payload['type'],
                'audience_mode' => FamilyPostAudienceMode::All->value,
                'is_important' => $payload['important'],
                'blocks' => [
                    [
                        'type' => 'text',
                        'position' => 0,
                        'text' => $payload['text'],
                    ],
                ],
            ]);

            $publisher->publish($author, $post);
        }

        $this->command?->info(sprintf(
            'عضو خانواده: %s | رمز: %s | خانواده: #%d',
            self::DEMO_MEMBER_MOBILE,
            self::DEMO_MEMBER_PASSWORD,
            FamilyMembership::query()->where('user_id', $member->id)->value('family_id') ?? 0,
        ));
    }
}
