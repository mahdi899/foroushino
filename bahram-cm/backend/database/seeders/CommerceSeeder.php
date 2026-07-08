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
                'title' => 'دوره کمپین‌نویسی حرفه‌ای',
                'type' => 'normal',
                'short_description' => 'یادگیری اصول نوشتن کمپین‌های فروش مؤثر برای کسب‌وکارهای آنلاین.',
                'description' => '<p>در این دوره با ساختار کمپین، متن‌نویسی فروش و اجرای عملی آشنا می‌شوید.</p>',
                'price' => 2_500_000,
                'sale_price' => 1_990_000,
                'is_active' => true,
                'meta_title' => 'دوره کمپین‌نویسی | بهرام رستمی',
                'meta_description' => 'آموزش کمپین‌نویسی و فروش آنلاین با بهرام رستمی.',
            ],
        );

        $package = Product::query()->updateOrCreate(
            ['slug' => 'sales-growth-package'],
            [
                'title' => 'پکیج رشد فروش',
                'type' => 'package',
                'short_description' => 'مجموعه دوره‌ها و فایل‌های عملی برای افزایش فروش.',
                'description' => '<p>شامل دوره کمپین‌نویسی، چک‌لیست اجرا و پشتیبانی محدود.</p>',
                'price' => 4_900_000,
                'sale_price' => null,
                'is_active' => true,
                'meta_title' => 'پکیج رشد فروش',
                'meta_description' => 'پکیج جامع آموزش و اجرای فروش آنلاین.',
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

        // Keep pending order without a completed payment row.
        Payment::query()->where('order_id', $pendingOrder->id)->delete();

        $this->call(StudentTestimonialSeeder::class);
    }
}
