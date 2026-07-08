<?php

namespace Database\Seeders;

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
        // Admin user for the dashboard.
        User::query()->updateOrCreate(
            ['email' => 'admin@bahram.local'],
            [
                'name' => 'مدیر بهرام',
                'password' => Hash::make('password'),
                'is_admin' => true,
            ]
        );

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
                    'max_history_messages' => 8,
                    'quick_suggestions' => [
                        [
                            'id' => 'courses',
                            'label' => 'دوره‌های آکادمی بهرام چیست؟',
                            'response' => 'آکادمی بهرام دوره‌های تخصصی در حوزه‌های فروش، بازاریابی، سات و رشد حرفه‌ای ارائه می‌دهد. برای مشاهده لیست دوره‌ها به صفحه «دوره‌ها» یا «آکادمی» مراجعه کنید.',
                        ],
                        [
                            'id' => 'consultation',
                            'label' => 'چطور مشاوره یا ثبت‌نام کنم؟',
                            'response' => 'برای مشاوره رایگان می‌توانید از دکمه «مشاوره رایگان» در همین چت، تماس تلفنی یا واتساپ استفاده کنید. تیم ما در اولین فرصت با شما هماهنگ می‌کند.',
                        ],
                        [
                            'id' => 'saat',
                            'label' => 'سات (SAT) چیست و چطور آماده شوم؟',
                            'response' => 'سات آزمون استاندارد پذیرش دانشگاه در آمریکا است. آکادمی بهرام برنامه آمادگی سات با مشاوره مسیر، منابع و کلاس‌های تخصصی دارد. برای جزئیات به صفحه «سات» مراجعه کنید.',
                        ],
                        [
                            'id' => 'support',
                            'label' => 'پشتیبانی و ساعات پاسخگویی',
                            'response' => 'ساعات پاسخگویی و راه‌های تماس در صفحه «تماس با ما» یا از طریق همین چت در دسترس است. در ساعات اداری معمولاً پاسخگویی سریع‌تر است.',
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
            'callback_url' => rtrim((string) config('app.url'), '/').'/api/payments/zarinpal/callback',
            'description_template' => 'خرید {product_title} - سفارش {order_number}',
        ]);

        SmsSetting::current()->update([
            'sms_provider' => 'melipayamak',
            'purchase_message_template' => 'کاربر عزیز، خرید شما با موفقیت ثبت شد. کد دسترسی شما: {code}',
        ]);

        SpotplayerSetting::current();

        $this->call(SmsCenterSeeder::class);
        $this->call(CacheIntegrationsSeeder::class);
        $this->call(CommerceSeeder::class);
    }
}
