<?php

namespace Database\Seeders;

use App\Models\Objection;
use App\Models\Product;
use App\Models\Script;
use Illuminate\Database\Seeder;

class ScriptObjectionSeeder extends Seeder
{
    public function run(): void
    {
        $mainProduct = Product::query()->where('slug', 'campaign-writing-job')->first();

        $scripts = [
            ['stage' => 'first_call', 'title' => 'شروع تماس اول', 'content' => "سلام وقت بخیر، خانم/آقای {نام}، من {نام کارشناس} هستم از تیم فروشینو. زمان دارید ۲ دقیقه درباره فرصتی که براتون در نظر گرفتیم صحبت کنیم؟"],
            ['stage' => 'interested', 'title' => 'معرفی دوره برای مشتری علاقه‌مند', 'content' => 'خیلی خوشحالم که علاقه‌مند هستید. این دوره دقیقاً برای کسانی طراحی شده که می‌خوان بدون نیاز به سرمایه اولیه، از راه دور و به‌صورت پروژه‌ای کار کنن. پشتیبانی کامل و ضمانت بازگشت وجه هم داریم.'],
            ['stage' => 'follow_up', 'title' => 'پیگیری بعد از تماس اول', 'content' => 'سلام مجدد، وقت بخیر. زنگ زدم ببینم به نتیجه‌ای رسیدید یا سوالی مونده که بتونم کمک کنم؟'],
            ['stage' => 'payment_pending', 'title' => 'یادآوری تکمیل پرداخت', 'content' => 'خدمت شما، لینک پرداخت رو ارسال کردم. اگر مشکلی توی پرداخت هست بگید همین الان با هم حلش کنیم که ثبت‌نامتون نهایی بشه.'],
            ['stage' => 'meeting', 'title' => 'دعوت به جلسه مشاوره', 'content' => 'پیشنهاد می‌کنم یک جلسه مشاوره رایگان ۱۵ دقیقه‌ای با مدرس دوره داشته باشید تا مسیر شغلی‌تون دقیق‌تر مشخص بشه.'],
        ];

        foreach ($scripts as $script) {
            Script::query()->firstOrCreate([
                'product_id' => $mainProduct?->id,
                'title' => $script['title'],
            ], [
                'stage' => $script['stage'],
                'content' => $script['content'],
            ]);
        }

        $objections = [
            ['key' => 'price', 'title' => 'قیمت بالاست', 'category' => 'مالی', 'suggested_response' => 'کاملاً درک می‌کنم. اگر بخوایم دقیق حساب کنیم، هزینه دوره کمتر از یک پروژه اوله که بعد از دوره می‌گیرید. همچنین امکان پرداخت اقساطی هم داریم.'],
            ['key' => 'time', 'title' => 'وقت ندارم', 'category' => 'زمان‌بندی', 'suggested_response' => 'دوره کاملاً آنلاین و آفلاینه، هر زمان که خودتون راحت باشید می‌تونید پیش برید. خیلی از دانشجوها در کنار شغل فعلی‌شون این دوره رو گذروندن.'],
            ['key' => 'trust', 'title' => 'به نتیجه‌بخش بودن دوره اطمینان ندارم', 'category' => 'اعتماد', 'suggested_response' => 'کاملاً حق دارید سوال کنید. ما نمونه‌کار و مصاحبه دانشجوهای قبلی رو داریم که براتون ارسال می‌کنم، همچنین ضمانت بازگشت وجه تا ۷ روز هم فعاله.'],
            ['key' => 'need_more_info', 'title' => 'اطلاعات بیشتری نیاز دارم', 'category' => 'اطلاعات', 'suggested_response' => 'حتماً، بروشور کامل دوره و سرفصل‌ها رو براتون ارسال می‌کنم و می‌تونیم یک تماس دیگه هم بذاریم تا سوالاتتون رو کامل جواب بدم.'],
            ['key' => 'thinking', 'title' => 'باید فکر کنم', 'category' => 'تصمیم‌گیری', 'suggested_response' => 'کاملاً منطقیه. چه سوالی هست که کمک کنه سریع‌تر تصمیم بگیرید؟ ظرفیت این دوره محدوده و ممکنه قیمت تغییر کنه، بد نیست زودتر تصمیم بگیرید.'],
            ['key' => 'spouse_decision', 'title' => 'باید با همسرم مشورت کنم', 'category' => 'تصمیم‌گیری', 'suggested_response' => 'کاملاً درسته. دوست دارید یک تماس سه‌نفره با همسرتون هم داشته باشیم تا سوالاتشون رو جواب بدم؟'],
            ['key' => 'no_budget', 'title' => 'بودجه‌ای ندارم', 'category' => 'مالی', 'suggested_response' => 'متوجه هستم. امکان پرداخت اقساطی داریم که فشار مالی کمتری داشته باشه، می‌خواید شرایطش رو براتون توضیح بدم؟'],
        ];

        foreach ($objections as $objection) {
            Objection::query()->firstOrCreate([
                'product_id' => $mainProduct?->id,
                'key' => $objection['key'],
            ], [
                'title' => $objection['title'],
                'category' => $objection['category'],
                'suggested_response' => $objection['suggested_response'],
            ]);
        }
    }
}
