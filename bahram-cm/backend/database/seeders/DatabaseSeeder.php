<?php

namespace Database\Seeders;

use App\Enums\AdminRoleName;
use App\Models\AiSetting;
use App\Models\ChatbotSetting;
use App\Models\PaymentSetting;
use App\Models\SeoSetting;
use App\Models\Setting;
use App\Models\SmsSetting;
use App\Models\SpotplayerSetting;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException(
                'DatabaseSeeder must not run in production — it seeds demo commerce/family data. '
                .'Use CacheIntegrationsSeeder / TelegramBotSeeder only, or app:create-admin.'
            );
        }

        // Admin user for the dashboard.
        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@bahram.local'],
            [
                'name' => 'مدیر بهرام',
                'mobile' => '09056013977',
                'mobile_verified_at' => now(),
                'password' => Hash::make('Bahram#123'),
                'is_admin' => true,
            ]
        );

        $this->call(RolePermissionSeeder::class);
        $this->call(SatRolePermissionSeeder::class);
        $this->call(DemoSatStaffSeeder::class);
        $this->call(StaffAdminSeeder::class);

        // Ensure the default admin always keeps super-admin (seeder may have run before this user existed).
        $admin->syncRoles([AdminRoleName::SuperAdmin->value]);
        $this->call(IdentityProviderSeeder::class);

        // Settings singletons with Persian-friendly defaults.
        AiSetting::current();

        ChatbotSetting::current()->update([
            'is_enabled' => true,
            'bot_name' => 'دستیار بهرام',
            'welcome_message' => 'سلام! من دستیار هوشمند آکادمی بهرام هستم. درباره دوره‌ها، سات یا مسیر رشد حرفه‌ای سوالی دارید؟',
            'system_prompt' => 'تو دستیار هوشمند وب‌سایت بهرام رستمی هستی. پاسخ‌ها را کوتاه، دقیق و به زبان فارسی بده.',
            'response_structure' => 'پاسخ را مختصر و مفید بده و در صورت نیاز کاربر را به تکمیل فرم تماس راهنمایی کن.',
            'fallback_message' => 'در حال حاضر امکان پاسخ‌گویی وجود ندارد. لطفاً بعداً دوباره تلاش کنید یا اطلاعات تماس خود را بگذارید.',
        ]);

        Setting::query()->updateOrCreate(
            ['group' => 'chatbot', 'key' => 'config'],
            [
                'value' => [
                    'enabled' => true,
                    'assistant_name' => 'دستیار بهرام',
                    'welcome_message' => 'سلام! من دستیار هوشمند آکادمی بهرام هستم. درباره دوره‌ها، سات یا مسیر رشد حرفه‌ای سوالی دارید؟',
                    'system_prompt_extra' => 'تو دستیار هوشمند وب‌سایت بهرام رستمی هستی. پاسخ‌ها را کوتاه، دقیق و به زبان فارسی بده.',
                    'rate_limit_per_minute' => 3,
                    'rate_limit_per_hour' => 10,
                    'operator_rate_limit_per_minute' => 3,
                    'operator_rate_limit_per_hour' => 10,
                    'global_hourly_cap' => 100,
                    'require_captcha' => true,
                    'honeypot_enabled' => true,
                    'cta_consultation' => true,
                    'cta_whatsapp' => true,
                    'cta_phone' => true,
                    'cta_pricing' => true,
                    'contacts' => [
                        'whatsapp' => ['enabled' => true, 'id' => '989120000000', 'label' => '۰۹۱۲۰۰۰۰۰۰۰'],
                        'telegram' => ['enabled' => true, 'id' => 'rostami_cm', 'label' => '@rostami_cm'],
                        'rubika' => ['enabled' => true, 'id' => 'live_rostami', 'label' => '@live_rostami'],
                        'instagram' => ['enabled' => true, 'id' => 'live_rostami', 'label' => '@live_rostami'],
                        'phone' => ['enabled' => true, 'id' => '+982100000000', 'label' => '۰۲۱-۰۰۰۰۰۰۰۰'],
                    ],
                    'max_history_messages' => 8,
                    'quick_suggestions' => [
                        [
                            'id' => 'which-course',
                            'label' => 'کدام دوره برای من مناسب‌تر است؟',
                            'response' => 'انتخاب دوره به هدف و سطح فعلی شما بستگی دارد. اگر هنوز مطمئن نیستید، با پاسخ به چند سؤال کوتاه درباره تجربه، مهارت و هدفتان، مناسب‌ترین مسیر آموزشی را به شما پیشنهاد می‌دهم.',
                        ],
                        [
                            'id' => 'how-to-register',
                            'label' => 'چطور می‌توانم ثبت‌نام کنم؟',
                            'response' => 'برای ثبت‌نام، وارد صفحه دوره موردنظرتان شوید و روی گزینه «ثبت‌نام» بزنید. بعد از تکمیل اطلاعات و پرداخت، دسترسی دوره در حساب کاربری شما فعال می‌شود.',
                        ],
                        [
                            'id' => 'what-is-saat',
                            'label' => 'سات چیست و چطور می‌توانم وارد آن شوم؟',
                            'response' => 'سات پلتفرم فروش تلفنی آکادمی بهرام است که برای آموزش، تمرین و فعالیت حرفه‌ای در فروش طراحی شده. برای ورود باید شرایط اولیه را داشته باشید و درخواست عضویتتان را ثبت کنید تا بررسی شود.',
                        ],
                        [
                            'id' => 'course-support',
                            'label' => 'دوره‌ها چه پشتیبانی و دسترسی‌ای دارند؟',
                            'response' => 'بعد از ثبت‌نام، به محتوای دوره و مسیر آموزشی آن دسترسی خواهید داشت. برای سؤالات آموزشی یا مشکلات فنی نیز می‌توانید از بخش پشتیبانی با تیم ما در ارتباط باشید.',
                        ],
                    ],
                ],
            ],
        );

        SeoSetting::current()->update([
            'robots_txt' => "User-agent: *\nAllow: /\n\nSitemap: ".rtrim((string) config('app.url'), '/')."/sitemap.xml\n",
        ]);

        PaymentSetting::current()->update([
            'sandbox_mode' => true,
            'currency' => 'IRT',
            // null → PaymentSetting::defaultCallbackUrl() (FRONTEND_URL), never APP_URL/loopback
            'callback_url' => null,
            'description_template' => 'خرید {product_title} - سفارش {order_number}',
        ]);

        SmsSetting::current()->update([
            'sms_provider' => 'melipayamak',
            'purchase_message_template' => 'کاربر عزیز، خرید شما با موفقیت ثبت شد. کد دسترسی شما: {code}',
        ]);

        SpotplayerSetting::current();

        $this->call(SmsCenterSeeder::class);
        $this->call(AdminTelegramSeeder::class);
        $this->call(TelegramBotSeeder::class);
        $this->call(BrandSocialLinksSeeder::class);
        $this->call(CacheIntegrationsSeeder::class);
        $this->call(MediaHostsSeeder::class);
        $this->call(CommerceSeeder::class);
        $this->call(SeminarSeeder::class);
        $this->call(SeminarZaferaniyehAttendeesSeeder::class);
        $this->call(MiniCourseSeeder::class);
        $this->call(FamilySeeder::class);
        $this->call(LocalDemoStudentSeeder::class);
    }
}
