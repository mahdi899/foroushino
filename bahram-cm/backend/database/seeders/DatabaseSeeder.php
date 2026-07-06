<?php

namespace Database\Seeders;

use App\Models\AiSetting;
use App\Models\ChatbotSetting;
use App\Models\PaymentSetting;
use App\Models\SeoSetting;
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
            'bot_name' => 'دستیار بهرام',
            'welcome_message' => 'سلام! چطور می‌تونم کمکتون کنم؟',
            'system_prompt' => 'تو دستیار هوشمند وب‌سایت بهرام رستمی هستی. پاسخ‌ها را کوتاه، دقیق و به زبان فارسی بده.',
            'response_structure' => 'پاسخ را مختصر و مفید بده و در صورت نیاز کاربر را به تکمیل فرم تماس راهنمایی کن.',
            'fallback_message' => 'در حال حاضر امکان پاسخ‌گویی وجود ندارد. لطفاً بعداً دوباره تلاش کنید یا اطلاعات تماس خود را بگذارید.',
        ]);

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
            'sms_provider' => 'kavenegar',
            'purchase_message_template' => 'کاربر عزیز، خرید شما با موفقیت ثبت شد. کد دسترسی شما: {code}',
        ]);

        SpotplayerSetting::current();
    }
}
