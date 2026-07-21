<?php

namespace Database\Seeders;

use App\Models\Faq;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Database\Seeder;

class CommerceSeeder extends Seeder
{
    public function run(): void
    {
        $campaign = Product::query()->updateOrCreate(
            ['slug' => 'campaign-writing'],
            [
                'title' => "دوره کمپین‌نویسی حرفه‌ای",
                'type' => 'normal',
                'short_description' => "مسیر ساختن شغل کمپین‌نویسی؛ از شناخت مشتری و پیام فروش تا پیشنهاد، مکالمه فروش و پیگیری تا خرید — تبلیغ را به فروش وصل کن.",
                'description' => <<<'HTML'
<h2>دوره کمپین‌نویسی حرفه‌ای چیست؟</h2>
<p>این دوره مسیر ساختن مهارتی است که تبلیغ را به فروش وصل می‌کند. اینجا یاد نمی‌گیری فقط متن قشنگ بنویسی؛ یاد می‌گیری کمپین را طوری طراحی کنی که مخاطب دلیل ادامه دادن و خرید پیدا کند.</p>
<p>کمپین‌نویسی فقط «کپشن اینستاگرام» نیست. کمپین یعنی شناخت مشتری، پیام مرکزی، پیشنهاد فروش، مکالمه و پیگیری — یک مسیر کامل از دیده شدن تا خرید.</p>

<h2>این دوره برای چه کسانی است؟</h2>
<ul>
<li>می‌خواهی کمپین‌نویسی را به‌عنوان مهارت درآمدزا یاد بگیری</li>
<li>در فروش، بازاریابی یا محتوا کار می‌کنی و می‌خواهی نتیجه بگیری</li>
<li>صاحب کسب‌وکار هستی و تبلیغ‌هایت دیده می‌شود ولی فروش نمی‌آورد</li>
<li>می‌خواهی از تولید محتوای پراکنده به مسیر کمپین‌محور برسی</li>
</ul>

<h2>در این دوره چه یاد می‌گیری؟</h2>
<h3>۱) شناخت کمپین</h3>
<p>می‌فهمی کمپین چیست، با تبلیغ پراکنده چه فرقی دارد، چه اجزایی دارد و اشتباهات رایج شروع کجاست.</p>
<h3>۲) شناخت مشتری</h3>
<p>مشتری را از نگاه فروش می‌شناسی: نیاز واقعی، نگرانی‌ها، تردید خرید و زبانی که به او می‌نشیند.</p>
<h3>۳) نوشتن پیام فروش</h3>
<p>پیام اصلی را ساده، روشن و قابل استفاده می‌نویسی؛ تیتر، توضیح کوتاه و دعوت به خرید برای اینستا، پیام و تماس.</p>
<h3>۴) ساخت پیشنهاد فروش</h3>
<p>پیشنهادی می‌سازی که ارزش، مزیت و دلیل خرید را روشن کند و نگرانی قبل از خرید را جواب بدهد.</p>
<h3>۵) مکالمه فروش و پیگیری</h3>
<p>یاد می‌گیری مکالمه را شروع کنی، به اعتراض جواب بدهی، پیگیری کنی و مشتری را به خرید نزدیک کنی.</p>

<h2>خروجی دوره</h2>
<ul>
<li>توانایی طراحی یک کمپین واقعی و قابل اجرا برای محصول یا خدمت</li>
<li>شناخت مشتری بدون حدس‌زدن</li>
<li>نوشتن پیام فروش که دلیل ادامه دادن بسازد</li>
<li>ساخت پیشنهاد فروش قوی</li>
<li>چیدن مسیر پیگیری تا خرید</li>
</ul>

<h2>شیوه یادگیری</h2>
<p>تمرکز دوره روی کار عملی است. قدم‌به‌قدم پیش می‌روی و در پایان باید بتوانی یک کمپین واقعی طراحی کنی. بعد از ثبت‌نام، دسترسی از طریق SpotPlayer برایت باز می‌شود و در مسیر یادگیری همراهی می‌گیری.</p>

<h2>این دوره برای چه کسانی نیست؟</h2>
<ul>
<li>دنبال پول سریع بدون تمرین هستی</li>
<li>فقط می‌خواهی تماشا کنی و تمرین نکنی</li>
<li>حاضر نیستی روی تمرین‌ها وقت بگذاری</li>
</ul>
HTML,
                'price' => 2_500_000,
                'sale_price' => 1_990_000,
                'referral_cashback_enabled' => true,
                'referral_cashback_type' => 'fixed',
                'referral_cashback_value' => 2_000_000,
                'is_active' => true,
                'show_on_courses' => true,
                'featured_listing' => true,
                'course_level' => "مسیر حرفه‌ای",
                'course_duration' => "۱۰ فصل",
                'landing_href' => '/course/campaign-writing',
                'meta_title' => "دوره کمپین‌نویسی حرفه‌ای | بهرام رستمی",
                'meta_description' => "دوره کمپین‌نویسی حرفه‌ای بهرام رستمی؛ از شناخت مشتری و پیام فروش تا پیشنهاد، مکالمه و پیگیری — مسیر ساختن شغل کمپین‌نویسی.",
            ],
        );

        $package = Product::query()->updateOrCreate(
            ['slug' => 'sales-growth-package'],
            [
                'title' => "پکیج رشد فروش",
                'type' => 'package',
                'short_description' => "مسیر کامل‌تر رشد فروش؛ دوره کمپین‌نویسی به‌همراه ابزارهای اجرا، چک‌لیست‌های عملی و پشتیبانی برای رساندن آموزش به فروش واقعی.",
                'description' => <<<'HTML'
<h2>پکیج رشد فروش چیست؟</h2>
<p>پکیج رشد فروش برای کسانی طراحی شده که نمی‌خواهند فقط آموزش ببینند؛ می‌خواهند مسیر از یادگیری تا اجرای فروش کوتاه‌تر و روشن‌تر باشد.</p>
<p>در این پکیج، دوره کمپین‌نویسی حرفه‌ای با ابزارهای اجرایی و پشتیبانی محدود کنار هم قرار می‌گیرد تا بتوانی سریع‌تر کمپین و فروش را روی زمین پیاده کنی.</p>

<h2>چه چیزی داخل پکیج است؟</h2>
<ul>
<li><strong>دوره کمپین‌نویسی حرفه‌ای:</strong> مسیر کامل از شناخت مشتری تا پیام، پیشنهاد، مکالمه و پیگیری</li>
<li><strong>ابزارهای اجرا:</strong> چک‌لیست‌ها و فایل‌های عملی برای پیاده‌سازی کمپین و فروش</li>
<li><strong>پشتیبانی شروع:</strong> همراهی برای اینکه از تماشا به اجرا برسی</li>
</ul>

<h2>این پکیج برای چه کسانی مناسب است؟</h2>
<ul>
<li>می‌خواهی آموزش کمپین‌نویسی را سریع‌تر به نتیجه فروش برسانی</li>
<li>صاحب کسب‌وکار یا مسئول فروشی هستی که به مسیر اجرایی نیاز دارد</li>
<li>نمی‌خواهی بین چند دوره و فایل پراکنده سردرگم شوی</li>
<li>به‌دنبال یک بسته جمع‌وجور برای رشد فروش هستی</li>
</ul>

<h2>تفاوت با خرید تکی دوره</h2>
<p>خرید تکی دوره روی یادگیری تمرکز دارد. پکیج رشد فروش روی «یادگیری + اجرا» تمرکز دارد؛ یعنی ابزار و پشتیبانی کنار آموزش می‌آید تا فاصله بین دانستن و فروختن کمتر شود.</p>

<h2>نتیجه‌ای که می‌گیری</h2>
<ul>
<li>مسیر روشن از آموزش تا اجرای کمپین</li>
<li>ابزارهایی برای پیاده‌سازی پیام و پیشنهاد فروش</li>
<li>شروع سریع‌تر فروش بدون سردرگمی در منابع پراکنده</li>
</ul>

<p>اگر هدف‌ات فقط دیدن محتوا نیست و می‌خواهی فروش را جلو ببری، این پکیج مسیر جمع‌وجورتری است.</p>
HTML,
                'price' => 4_900_000,
                'sale_price' => null,
                'is_active' => true,
                'featured_listing' => true,
                'course_level' => "پکیج جامع",
                'course_duration' => "دسترسی کامل",
                'landing_href' => '/purchase/sales-growth-package',
                'meta_title' => "پکیج رشد فروش | بهرام رستمی",
                'meta_description' => "پکیج رشد فروش بهرام رستمی؛ دوره کمپین‌نویسی به‌همراه ابزارهای اجرا و پشتیبانی برای رساندن آموزش به فروش واقعی.",
            ],
        );

        $faqs = [
            [
                'question' => 'بعد از خرید چطور به دوره دسترسی پیدا کنم؟',
                'answer' => 'پس از پرداخت موفق، کد دسترسی SpotPlayer از طریق پیامک برای شما ارسال می‌شود.',
                'category' => 'خرید',
                'sort_order' => 1,
            ],
            [
                'question' => 'آیا امکان بازگشت وجه وجود دارد؟',
                'answer' => 'تا ۷۲ ساعت پس از خرید، در صورت عدم استفاده از محتوا می‌توانید درخواست بازگشت وجه ثبت کنید.',
                'category' => 'خرید',
                'sort_order' => 2,
            ],
            [
                'question' => 'پشتیبانی دوره به چه صورت است؟',
                'answer' => 'پشتیبانی از طریق تیکت در پنل کاربری و پاسخ‌گویی در روزهای کاری انجام می‌شود.',
                'category' => 'پشتیبانی',
                'sort_order' => 3,
            ],
        ];

        foreach ($faqs as $faq) {
            Faq::query()->updateOrCreate(
                ['question' => $faq['question']],
                [
                    'answer' => $faq['answer'],
                    'category' => $faq['category'],
                    'sort_order' => $faq['sort_order'],
                    'is_active' => true,
                ],
            );
        }

        $pendingOrder = Order::query()->updateOrCreate(
            ['order_number' => 'BR-10001'],
            [
                'product_id' => $campaign->id,
                'customer_name' => 'علی محمدی',
                'customer_phone' => '09121234567',
                'customer_email' => 'ali@example.com',
                'amount' => $campaign->price,
                'discount_amount' => $campaign->price - $campaign->effective_price,
                'final_amount' => $campaign->effective_price,
                'status' => 'pending_payment',
                'payment_status' => 'pending',
            ],
        );

        $paidOrder = Order::query()->updateOrCreate(
            ['order_number' => 'BR-10002'],
            [
                'product_id' => $package->id,
                'customer_name' => 'سارا احمدی',
                'customer_phone' => '09129876543',
                'customer_email' => 'sara@example.com',
                'amount' => $package->price,
                'discount_amount' => 0,
                'final_amount' => $package->price,
                'status' => 'paid',
                'payment_status' => 'paid',
                'spotplayer_license_code' => 'DEMO-LICENSE-001',
                'paid_at' => now()->subDays(2),
                'sms_sent_at' => now()->subDays(2),
            ],
        );

        Payment::query()->updateOrCreate(
            [
                'order_id' => $paidOrder->id,
                'gateway' => 'zarinpal',
            ],
            [
                'authority' => 'A0000000000000000000000000000demo',
                'ref_id' => '123456789',
                'amount' => $paidOrder->final_amount,
                'status' => 'paid',
                'paid_at' => $paidOrder->paid_at,
                'verify_payload' => [
                    'data' => [
                        'code' => 100,
                        'ref_id' => 123456789,
                        'card_pan' => '6104-33**-****-1234',
                    ],
                ],
            ],
        );

        Payment::query()->where('order_id', $pendingOrder->id)->delete();

        $this->call(StudentTestimonialSeeder::class);
    }
}
