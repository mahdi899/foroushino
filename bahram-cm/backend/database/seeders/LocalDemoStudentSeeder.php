<?php

namespace Database\Seeders;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use App\Enums\SeminarAttendanceStatus;
use App\Models\CourseAccess;
use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Services\ReferenceChannelAccessService;
use Illuminate\Database\Seeder;

/**
 * Local-only student for panel QA: OTP login with OTP_DEV_CODE.
 */
class LocalDemoStudentSeeder extends Seeder
{
    public const MOBILE = '09011111111';

    public const CAMPAIGN_WRITING_SLUG = 'campaign-writing';

    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            return;
        }

        $user = User::query()->updateOrCreate(
            ['mobile' => self::MOBILE],
            [
                'name' => 'دانشجوی دمو لوکال',
                'mobile_verified_at' => now(),
                'is_admin' => false,
                'is_sat_staff' => false,
            ],
        );

        $channel = ReferenceChannel::query()
            ->where('slug', ReferenceChannelSeeder::SLUG)
            ->first();

        if ($channel) {
            $channel->forceFill([
                'status' => 'published',
                'show_in_panel' => true,
                'show_in_telegram' => true,
            ])->save();

            if ($channel->product) {
                $channel->product->update(['is_active' => true]);
            }

            app(ReferenceChannelAccessService::class)->grant($channel, $user, null, 'local_demo');
        }

        $seminar = Seminar::query()
            ->where('slug', 'smynar-zaafranyh-thran')
            ->first();

        if ($seminar) {
            $seminar->forceFill(['status' => 'published'])->save();

            if ($seminar->product) {
                $seminar->product->update(['is_active' => true]);
            }

            SeminarAttendee::query()->firstOrCreate(
                [
                    'seminar_id' => $seminar->id,
                    'user_id' => $user->id,
                ],
                [
                    'attendance_status' => SeminarAttendanceStatus::Attended,
                ],
            );
        }

        $campaign = Product::query()->where('slug', self::CAMPAIGN_WRITING_SLUG)->first();
        if ($campaign) {
            $campaign->update(['is_active' => true]);

            $access = CourseAccess::query()->firstOrCreate(
                [
                    'user_id' => $user->id,
                    'product_id' => $campaign->id,
                ],
                [
                    'status' => CourseAccessStatus::Active,
                    'access_type' => 'lifetime',
                    'source' => CourseAccessSource::Manual,
                    'activated_at' => now(),
                ],
            );

            if ($access->status !== CourseAccessStatus::Active) {
                $access->update([
                    'status' => CourseAccessStatus::Active,
                    'activated_at' => now(),
                    'deactivated_at' => null,
                ]);
            }
        }

        $this->command?->info(
            'لوکال پنل دانشجو: '.self::MOBILE.' | OTP: '.(string) config('bahram.otp.dev_code', '12345')
            .' | کانال مرجع + سمینار + کمپین‌نویسی فعال'
        );
    }
}
