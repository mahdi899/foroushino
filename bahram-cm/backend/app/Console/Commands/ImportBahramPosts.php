<?php

namespace App\Console\Commands;

use App\Models\Article;
use App\Models\Media;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Import a curated set of articles from the legacy bahramrostami.ir WordPress
 * site into the local articles table. Content is cleaned of WordPress markup,
 * SEO metadata is rewritten, and every image (featured + inline) is pulled into
 * the media library under media/site.
 */
class ImportBahramPosts extends Command
{
    protected $signature = 'content:import-bahram-posts {--force : Overwrite existing articles by slug}';

    protected $description = 'Import and SEO-clean selected articles from bahramrostami.ir into the blog';

    private const API = 'https://bahramrostami.ir/wp-json/wp/v2/posts';

    /**
     * @var list<array<string, string>>
     */
    private array $posts = [
        [
            'source_slug' => 'selling-technique-in-story',
            'slug' => 'sell-in-instagram-story',
            'title' => 'تکنیک فروش در استوری اینستاگرام؛ ۱۲ روش طلایی برای فروش بیشتر',
            'focus_keyword' => 'تکنیک فروش در استوری',
            'kicker' => 'فروش',
            'meta_title' => 'تکنیک فروش در استوری اینستاگرام | ۱۲ روش عملی فروش بیشتر',
            'meta_description' => 'با ۱۲ تکنیک فروش در استوری اینستاگرام، از ایجاد حس نیاز تا دعوت به اقدام، مخاطب را به مشتری تبدیل کنید و فروش پیج خود را افزایش دهید.',
            'excerpt' => 'استوری بهترین بستر برای جذب مشتری و فروش است. در این راهنما ۱۲ تکنیک عملی فروش در استوری اینستاگرام را مرور می‌کنیم.',
        ],
        [
            'source_slug' => 'increase-sales-on-instagram',
            'slug' => 'increase-instagram-sales',
            'title' => 'افزایش فروش در اینستاگرام؛ راهنمای کامل تبدیل فالوور به مشتری',
            'focus_keyword' => 'افزایش فروش در اینستاگرام',
            'kicker' => 'فروش',
            'meta_title' => 'افزایش فروش در اینستاگرام | راهنمای عملی رشد فروش پیج',
            'meta_description' => 'چطور فروش در اینستاگرام را بالا ببریم؟ راهکارهای عملی برای تبدیل فالوور به مشتری، ساخت اعتماد و افزایش فروش پیج کاری در این راهنما.',
            'excerpt' => 'اینستاگرام دنیایی پر از فرصت برای فروش است. در این مقاله راهکارهای عملی افزایش فروش و تبدیل فالوور به مشتری را بررسی می‌کنیم.',
        ],
        [
            'source_slug' => '6-basic-content-production-techniques',
            'slug' => 'content-production-techniques',
            'title' => '۶ تکنیک اصولی تولید محتوا که فروش شما را چند برابر می‌کند',
            'focus_keyword' => 'تولید محتوا',
            'kicker' => 'تولید محتوا',
            'meta_title' => '۶ تکنیک اصولی تولید محتوا برای فروش بیشتر',
            'meta_description' => 'با ۶ تکنیک اصولی تولید محتوا، محتوایی بسازید که مخاطب را جذب و به خرید ترغیب می‌کند؛ از شناخت مخاطب تا ساخت پیام فروش.',
            'excerpt' => 'تولید محتوای اصولی، مسیر رشد کسب‌وکار در فضای مجازی است. در این مقاله ۶ تکنیک کاربردی تولید محتوای منجر به فروش را می‌آموزید.',
        ],
        [
            'source_slug' => 'scenario-writing-in-the-story',
            'slug' => 'instagram-story-scenario',
            'title' => 'سناریو نویسی استوری؛ چرا و چگونه برای اینستاگرام سناریو بنویسیم؟',
            'focus_keyword' => 'سناریو نویسی استوری',
            'kicker' => 'تولید محتوا',
            'meta_title' => 'سناریو نویسی استوری اینستاگرام | راهنمای گام‌به‌گام',
            'meta_description' => 'سناریو نویسی استوری یعنی طراحی مسیر جذاب برای مخاطب تا در نهایت به خرید برسد. اصول و مراحل نوشتن سناریوی استوری اینستاگرام را بیاموزید.',
            'excerpt' => 'برای جذب مخاطب بیشتر و فروش محصول، به سناریوی جذاب استوری نیاز دارید. اصول سناریو نویسی استوری اینستاگرام را در این مقاله بخوانید.',
        ],
        [
            'source_slug' => 'writing-a-sales-campaign',
            'slug' => 'sales-campaign-writing',
            'title' => 'نوشتن کمپین فروش پرفروش؛ راهنمای کامل کمپین‌نویسی',
            'focus_keyword' => 'کمپین فروش',
            'kicker' => 'کمپین‌نویسی',
            'meta_title' => 'نوشتن کمپین فروش | راهنمای کامل کمپین‌نویسی موفق',
            'meta_description' => 'کمپین فروش موفق چطور نوشته می‌شود؟ از شناخت مخاطب و پیام اصلی تا دعوت به اقدام؛ راهنمای کامل کمپین‌نویسی برای فروش بیشتر.',
            'excerpt' => 'فرق برند موفق با بقیه در بلد بودن کمپین‌نویسی است. در این راهنما مسیر نوشتن یک کمپین فروش پرفروش را قدم‌به‌قدم مرور می‌کنیم.',
        ],
        [
            'source_slug' => 'instagram-algorithm',
            'slug' => 'instagram-algorithm',
            'title' => 'الگوریتم اینستاگرام چیست و چگونه کار می‌کند؟',
            'focus_keyword' => 'الگوریتم اینستاگرام',
            'kicker' => 'اینستاگرام',
            'meta_title' => 'الگوریتم اینستاگرام چیست؟ | راهنمای دیده‌شدن بیشتر',
            'meta_description' => 'الگوریتم اینستاگرام چگونه محتوای شما را به مخاطب نشان می‌دهد؟ با شناخت سیگنال‌های الگوریتم، دیده‌شدن و تعامل پیج خود را افزایش دهید.',
            'excerpt' => 'الگوریتم اینستاگرام تعیین می‌کند چه محتوایی به چه کسی نمایش داده شود. در این مقاله عملکرد الگوریتم و راه رشد پیج را بررسی می‌کنیم.',
        ],
        [
            'source_slug' => 'call-in-action',
            'slug' => 'instagram-call-to-action',
            'title' => 'کال تو اکشن (CTA) اینستاگرام چیست و چه انواعی دارد؟',
            'focus_keyword' => 'کال تو اکشن',
            'kicker' => 'تولید محتوا',
            'meta_title' => 'کال تو اکشن اینستاگرام چیست؟ | انواع CTA مؤثر',
            'meta_description' => 'کال تو اکشن یا دعوت به اقدام، مخاطب را به واکنش وامی‌دارد. با انواع CTA اینستاگرام و نحوه نوشتن آن‌ها، تعامل و فروش پیج را بالا ببرید.',
            'excerpt' => 'برای گرفتن تعامل بالا، پست‌ها به کال تو اکشن نیاز دارند. در این مقاله انواع CTA اینستاگرام و روش نوشتن آن‌ها را می‌آموزید.',
        ],
        [
            'source_slug' => 'instagram-seo',
            'slug' => 'instagram-seo',
            'title' => 'سئو اینستاگرام چیست و چه تأثیری بر رشد پیج دارد؟',
            'focus_keyword' => 'سئو اینستاگرام',
            'kicker' => 'اینستاگرام',
            'meta_title' => 'سئو اینستاگرام | راهنمای بهینه‌سازی پیج برای دیده‌شدن',
            'meta_description' => 'سئو اینستاگرام یعنی بهینه‌سازی پیج و محتوا برای دیده‌شدن بیشتر در جست‌وجو. اصول سئوی اینستاگرام برای رشد پیج و افزایش فروش را بیاموزید.',
            'excerpt' => 'برای دیده‌شدن توسط میلیون‌ها نفر باید سئوی اینستاگرام را جدی بگیرید. در این مقاله اصول و ترفندهای سئو اینستاگرام را بررسی می‌کنیم.',
        ],
        [
            'source_slug' => 'increase-instagram-engagement',
            'slug' => 'increase-instagram-engagement',
            'title' => 'افزایش تعامل در اینستاگرام؛ ۷ نکته کلیدی و طلایی',
            'focus_keyword' => 'افزایش تعامل اینستاگرام',
            'kicker' => 'اینستاگرام',
            'meta_title' => 'افزایش تعامل اینستاگرام | ۷ نکته عملی برای رشد پیج',
            'meta_description' => 'برای افزایش تعامل در اینستاگرام به محتوای جذاب و رویکرد استراتژیک نیاز دارید. ۷ نکته کلیدی برای بالا بردن لایک، کامنت و ذخیره پست‌ها.',
            'excerpt' => 'تعامل بالا، کلید رشد پیج در اینستاگرام است. در این مقاله ۷ نکته کلیدی و عملی برای افزایش تعامل مخاطبان را مرور می‌کنیم.',
        ],
        [
            'source_slug' => 'tricks-of-persuading-customers',
            'slug' => 'customer-persuasion-tricks',
            'title' => 'ترفندهای متقاعدسازی مشتری؛ اصول روان‌شناسی فروش',
            'focus_keyword' => 'متقاعدسازی مشتری',
            'kicker' => 'فروش',
            'meta_title' => 'ترفندهای متقاعدسازی مشتری | اصول روان‌شناسی فروش',
            'meta_description' => 'با ترفندهای متقاعدسازی مشتری و اصول روان‌شناسی فروش، ارتباط مؤثرتری بسازید و نرخ تبدیل و فروش خود را افزایش دهید.',
            'excerpt' => 'متقاعدسازی مشتری مهارتی است که فروش را متحول می‌کند. در این مقاله ترفندهای عملی و اصول روان‌شناسی فروش را می‌آموزید.',
        ],
    ];

    /** @var list<array<string, string>> */
    private array $extraPosts = [
        [
            'source_slug' => 'goal-setting-training-1',
            'slug' => 'goal-setting-training-part-1',
            'title' => 'آموزش هدف‌گذاری حرفه‌ای؛ قسمت اول (ویدیو رایگان)',
            'focus_keyword' => 'هدف گذاری',
            'kicker' => 'آموزش',
            'meta_title' => 'آموزش هدف‌گذاری حرفه‌ای | قسمت اول — ویدیو رایگان',
            'meta_description' => 'در قسمت اول آموزش رایگان هدف‌گذاری، اصول تعیین هدف SMART و مسیر رسیدن به اهداف فروش و رشد کسب‌وکار را با ویدیو یاد بگیرید.',
            'excerpt' => 'هدف‌گذاری درست، نقطه شروع هر مسیر موفقیت است. در این ویدیوی رایگان قسمت اول آموزش هدف‌گذاری حرفه‌ای را ببینید.',
            'cover_fallback' => 'media/site/insight-cover-1.svg',
            'content_intro' => '<p>هدف‌گذاری یکی از مهم‌ترین مهارت‌های هر فروشنده و صاحب کسب‌وکار است. بدون هدف مشخص، انرژی و زمان شما پراکنده می‌شود. در ویدیوی زیر قسمت اول آموزش رایگان هدف‌گذاری را تماشا کنید.</p>',
        ],
        [
            'source_slug' => 'goal-setting-training-2',
            'slug' => 'goal-setting-training-part-2',
            'title' => 'آموزش هدف‌گذاری حرفه‌ای؛ قسمت دوم (ویدیو رایگان)',
            'focus_keyword' => 'هدف گذاری',
            'kicker' => 'آموزش',
            'meta_title' => 'آموزش هدف‌گذاری حرفه‌ای | قسمت دوم — ویدیو رایگان',
            'meta_description' => 'قسمت دوم آموزش هدف‌گذاری: چگونه اهداف سالانه و ماهانه بنویسیم و آن‌ها را به برنامه روزانه تبدیل کنیم. ویدیوی رایگان بهرام رستمی.',
            'excerpt' => 'در قسمت دوم آموزش هدف‌گذاری، نحوه تبدیل اهداف بزرگ به اقدامات روزانه و پیگیری پیشرفت را یاد می‌گیرید.',
            'cover_fallback' => 'media/site/insight-cover-2.svg',
            'content_intro' => '<p>در قسمت اول با اصول هدف‌گذاری آشنا شدید. حالا در قسمت دوم یاد می‌گیرید چطور اهداف را به برنامه عملی تبدیل کنید.</p>',
        ],
        [
            'source_slug' => 'sales-alphabet',
            'slug' => 'sales-alphabet-campaign',
            'title' => 'الفبای فروش در کمپین‌نویسی؛ آموزش ویدیویی رایگان',
            'focus_keyword' => 'الفبای فروش',
            'kicker' => 'کمپین‌نویسی',
            'meta_title' => 'الفبای فروش در کمپین‌نویسی | ویدیوی رایگان',
            'meta_description' => 'الفبای فروش یعنی پایه‌های نوشتن کمپین‌های مؤثر. در این ویدیوی رایگان اصول اولیه کمپین‌نویسی و فروش در اینستاگرام را بیاموزید.',
            'excerpt' => 'قبل از نوشتن کمپین حرفه‌ای، باید الفبای فروش را بلد باشید. این ویدیوی رایگان پایه‌های کمپین‌نویسی را آموزش می‌دهد.',
            'cover_fallback' => 'media/site/insight-cover-3.svg',
            'content_intro' => '<p>کمپین‌نویسی بدون شناخت الفبای فروش، مثل نوشتن جمله بدون حروف الفباست. در ویدیوی زیر مبانی فروش و کمپین‌نویسی را قدم‌به‌قدم مرور می‌کنیم.</p>',
        ],
        [
            'source_slug' => 'scenario-writing',
            'slug' => 'scenario-writing-tutorial',
            'title' => 'آموزش سناریونویسی برای محتوای فروش؛ ویدیوی رایگان',
            'focus_keyword' => 'سناریو نویسی',
            'kicker' => 'تولید محتوا',
            'meta_title' => 'آموزش سناریونویسی | ویدیوی رایگان برای فروش بیشتر',
            'meta_description' => 'سناریونویسی مهارت کلیدی تولید محتوای فروش است. در این ویدیو اصول نوشتن سناریو برای ریلز، استوری و پست فروش را یاد بگیرید.',
            'excerpt' => 'سناریوی خوب، تفاوت بین محتوای فراموش‌شدنی و فروش مؤثر است. آموزش ویدیویی سناریونویسی را ببینید.',
            'cover_fallback' => 'media/site/insight-cover-1.svg',
            'content_intro' => '<p>هر محتوای فروش موفق، پشتش یک سناریوی دقیق دارد. در این آموزش ویدیویی با اصول سناریونویسی برای اینستاگرام آشنا می‌شوید.</p>',
        ],
        [
            'source_slug' => 'campaign-writing-job',
            'slug' => 'campaign-writer-career',
            'title' => 'شغل کمپین‌نویسی؛ آموزش ویدیویی رایگان + مسیر ورود',
            'focus_keyword' => 'شغل کمپین نویسی',
            'kicker' => 'کمپین‌نویسی',
            'meta_title' => 'شغل کمپین‌نویسی چیست؟ | آموزش ویدیویی رایگان',
            'meta_description' => 'کمپین‌نویسی یکی از پردرآمدترین مهارت‌های دیجیتال مارکتینگ است. در این ویدیو با شغل کمپین‌نویسی و مسیر یادگیری آن آشنا شوید.',
            'excerpt' => 'کمپین‌نویسی شغلی پردرآمد و پرتقاضاست. در این ویدیوی رایگان با این حرفه و مسیر ورود به آن آشنا می‌شوید.',
            'cover_fallback' => 'media/site/insight-cover-2.svg',
            'content_intro' => '<p>اگر به دنبال شغلی هستید که بتوانید از خانه کار کنید و درآمد خوبی داشته باشید، کمپین‌نویسی گزینه‌ای عالی است. ویدیوی زیر را ببینید.</p>',
        ],
        [
            'source_slug' => 'campaign-writing',
            'slug' => 'what-is-campaign-writing',
            'title' => 'کمپین‌نویسی چیست و چگونه کمپین تبلیغاتی موفق بسازیم؟',
            'focus_keyword' => 'کمپین نویسی',
            'kicker' => 'کمپین‌نویسی',
            'meta_title' => 'کمپین‌نویسی چیست؟ | راهنمای ایجاد کمپین تبلیغاتی موفق',
            'meta_description' => 'کمپین‌نویسی فرآیند طراحی پیام‌های هدفمند برای فروش است. مراحل، اهمیت و نکات کلیدی نوشتن کمپین تبلیغاتی موفق را در این مقاله بخوانید.',
            'excerpt' => 'کمپین‌نویسی ستون فقرات فروش دیجیتال است. در این راهنما با مفهوم کمپین‌نویسی و مراحل ساخت کمپین موفق آشنا می‌شوید.',
        ],
        [
            'source_slug' => '50-pure-story-ideas',
            'slug' => 'instagram-story-ideas',
            'title' => '۵۰ ایده ناب استوری برای افزایش فروش در اینستاگرام',
            'focus_keyword' => 'ایده استوری',
            'kicker' => 'تولید محتوا',
            'meta_title' => '۵۰ ایده استوری اینستاگرام | برای افزایش فروش',
            'meta_description' => '۵۰ ایده خلاقانه استوری اینستاگرام برای جذب مخاطب و افزایش فروش. از ایده‌های آموزشی تا فروش مستقیم — همین امروز امتحان کنید.',
            'excerpt' => 'ایده برای استوری ندارید؟ این لیست ۵۰ ایده ناب استوری را برای افزایش فروش و تعامل پیج خود استفاده کنید.',
        ],
        [
            'source_slug' => '50-million-hook-ideas',
            'slug' => 'reel-hook-ideas',
            'title' => '۵۰ ایده قلاب میلیونی برای ریلز اینستاگرام',
            'focus_keyword' => 'ایده قلاب ریلز',
            'kicker' => 'تولید محتوا',
            'meta_title' => '۵۰ ایده قلاب ریلز | برای بازدید میلیونی',
            'meta_description' => 'قلاب یا Hook اولین ثانیه ریلز است که مخاطب را نگه می‌دارد. ۵۰ ایده قلاب میلیونی برای ریلز اینستاگرام در این مقاله.',
            'excerpt' => 'قلاب قوی، تفاوت بین ریلز فراموش‌شدنی و وiral است. ۵۰ ایده قلاب برای شروع ریلزهای پر بازدید.',
        ],
        [
            'source_slug' => 'professional-captioning',
            'slug' => 'professional-caption-writing',
            'title' => '۶ نکته کپشن‌نویسی حرفه‌ای برای افزایش تعامل',
            'focus_keyword' => 'کپشن نویسی',
            'kicker' => 'تولید محتوا',
            'meta_title' => 'کپشن‌نویسی حرفه‌ای | ۶ نکته برای تعامل بیشتر',
            'meta_description' => 'کپشن‌نویسی حرفه‌ای تعامل پست را چند برابر می‌کند. ۶ نکته عملی برای نوشتن کپشن جذاب و فروش‌محور در اینستاگرام.',
            'excerpt' => 'کپشن خوب، پل بین محتوا و اقدام مخاطب است. ۶ نکته کپشن‌نویسی حرفه‌ای را در این مقاله بیاموزید.',
        ],
        [
            'source_slug' => 'direct-sales',
            'slug' => 'instagram-direct-sales',
            'title' => '۵ تکنیک طلایی فروش در دایرکت اینستاگرام',
            'focus_keyword' => 'فروش در دایرکت',
            'kicker' => 'فروش',
            'meta_title' => 'فروش در دایرکت اینستاگرام | ۵ تکنیک طلایی',
            'meta_description' => 'فروش در دایرکت اینستاگرام نیاز به تکنیک دارد. ۵ روش عملی برای تبدیل پیام‌های دایرکت به فروش واقعی را در این مقاله بخوانید.',
            'excerpt' => 'دایرکت اینستاگرام یکی از گرم‌ترین کانال‌های فروش است. ۵ تکنیک طلایی فروش در دایرکت را یاد بگیرید.',
        ],
        [
            'source_slug' => 'attract-more-customers',
            'slug' => 'attract-more-customers',
            'title' => 'جذب مشتری بیشتر با ۵ نکته کمپین‌نویسی تبلیغاتی',
            'focus_keyword' => 'جذب مشتری',
            'kicker' => 'فروش',
            'meta_title' => 'جذب مشتری بیشتر | ۵ نکته کمپین‌نویسی',
            'meta_description' => 'برای جذب مشتری بیشتر به کمپین‌های هدفمند نیاز دارید. ۵ نکته کمپین‌نویسی تبلیغاتی برای جذب مشتری جدید و افزایش فروش.',
            'excerpt' => 'جذب مشتری جدید هزینه‌بر است؛ با کمپین‌نویسی درست می‌توانید این هزینه را به حداقل برسانید.',
        ],
        [
            'source_slug' => 'forbidden-words-on-instagram',
            'slug' => 'instagram-forbidden-words',
            'title' => 'کلمات ممنوعه در اینستاگرام؛ لیست کامل و راهکارها',
            'focus_keyword' => 'کلمات ممنوعه اینستاگرام',
            'kicker' => 'اینستاگرام',
            'meta_title' => 'کلمات ممنوعه اینستاگرام | راهنمای جلوگیری از ریچ پایین',
            'meta_description' => 'کلمات ممنوعه در اینستاگرام می‌توانند ریچ پیج شما را نابود کنند. لیست کلمات پرخطر و جایگزین‌های امن را در این مقاله ببینید.',
            'excerpt' => 'استفاده از کلمات ممنوعه، یکی از دلایل افت ناگهانی بازدید است. لیست کلمات پرخطر و راهکارهای جایگزین.',
        ],
        [
            'source_slug' => 'professional-instagram-bio',
            'slug' => 'professional-instagram-bio',
            'title' => 'بیو حرفه‌ای اینستاگرام با ۶ تکنیک کاربردی',
            'focus_keyword' => 'بیو اینستاگرام',
            'kicker' => 'اینستاگرام',
            'meta_title' => 'بیو حرفه‌ای اینستاگرام | ۶ تکنیک عملی',
            'meta_description' => 'بیو اینستاگرام ویترین پیج شماست. با ۶ تکنیک کاربردی یک بیو حرفه‌ای بنویسید که مخاطب را به فالو و خرید ترغیب کند.',
            'excerpt' => 'اولین چیزی که بازدیدکننده می‌بیند، بیو شماست. ۶ تکنیک برای نوشتن بیو حرفه‌ای و فروش‌محور.',
        ],
        [
            'source_slug' => 'increase-followers',
            'slug' => 'increase-instagram-followers',
            'title' => '۸ نکته عملی برای افزایش فالوور واقعی اینستاگرام',
            'focus_keyword' => 'افزایش فالوور',
            'kicker' => 'اینستاگرام',
            'meta_title' => 'افزایش فالوور اینستاگرام | ۸ نکته عملی و واقعی',
            'meta_description' => 'افزایش فالوور واقعی اینستاگرام با محتوای باکیفیت و استراتژی درست ممکن است. ۸ نکته عملی که خودم امتحان کردم را بخوانید.',
            'excerpt' => 'فالوور فیک فایده ندارد. ۸ نکته عملی برای جذب فالوور واقعی و علاقه‌مند به برند شما.',
        ],
        [
            'source_slug' => 'explore',
            'slug' => 'instagram-explore-guide',
            'title' => '۸ راه ورود به اکسپلور اینستاگرام و رشد پیج',
            'focus_keyword' => 'اکسپلور اینستاگرام',
            'kicker' => 'اینستاگرام',
            'meta_title' => 'ورود به اکسپلور اینستاگرام | ۸ راه عملی',
            'meta_description' => 'اکسپلور اینستاگرام بهترین راه دیده‌شدن توسط مخاطب جدید است. ۸ راهکار عملی برای ورود به اکسپلور و رشد پیج را بیاموزید.',
            'excerpt' => 'اکسپلور دروازه رشد سریع پیج است. ۸ راهکار عملی برای ورود به اکسپلور اینستاگرام.',
        ],
    ];

    /** @return list<array<string, string>> */
    private function allPosts(): array
    {
        return array_merge($this->posts, $this->extraPosts);
    }

    public function handle(): int
    {
        $authorId = User::query()->where('is_admin', true)->orderBy('id')->value('id');
        $imported = 0;

        foreach ($this->allPosts() as $meta) {
            $existing = Article::withTrashed()->where('slug', $meta['slug'])->first();
            if ($existing && ! $this->option('force')) {
                $this->line("skip (exists): {$meta['slug']}");

                continue;
            }

            $this->line("fetching: {$meta['source_slug']}");
            $post = $this->fetchPost($meta['source_slug']);
            if (! $post) {
                $this->warn("  could not fetch {$meta['source_slug']}");

                continue;
            }

            $counter = 0;
            $rawHtml = (string) ($post['content']['rendered'] ?? '');
            if (! empty($meta['content_intro'])) {
                $rawHtml = $meta['content_intro'].$rawHtml;
            }
            $bodyHtml = $this->cleanContent(
                $rawHtml,
                $meta['slug'],
                $meta['title'],
                $counter,
            );
            $bodyHtml .= $this->closingCta($meta['focus_keyword']);

            $coverUrl = $post['_embedded']['wp:featuredmedia'][0]['source_url'] ?? null;
            $coverPath = $coverUrl
                ? $this->downloadImage($coverUrl, $meta['slug'].'-cover', $meta['title'])
                : ($meta['cover_fallback'] ?? null);

            $words = str_word_count(strip_tags($bodyHtml));
            $minutes = max(2, (int) round($words / 200));
            $publishedAt = isset($post['date_gmt'])
                ? Carbon::parse($post['date_gmt'], 'UTC')
                : now();

            Article::withTrashed()->updateOrCreate(
                ['slug' => $meta['slug']],
                [
                    'title' => $meta['title'],
                    'excerpt' => $meta['excerpt'],
                    'content' => $bodyHtml,
                    'featured_image' => $coverPath,
                    'kicker' => $meta['kicker'],
                    'reading_time' => $this->persianDigits($minutes).' دقیقه',
                    'meta_title' => $meta['meta_title'],
                    'meta_description' => $meta['meta_description'],
                    'focus_keyword' => $meta['focus_keyword'],
                    'canonical_url' => null,
                    'is_indexable' => true,
                    'status' => 'published',
                    'published_at' => $publishedAt,
                    'author_id' => $authorId,
                    'deleted_at' => null,
                ],
            );

            $this->info("  imported: {$meta['title']}");
            $imported++;
        }

        $this->info("Done. Imported/updated {$imported} article(s).");
        $this->line('Run: php artisan media:sync --export  to persist the media manifest.');

        return self::SUCCESS;
    }

    private function fetchPost(string $slug): ?array
    {
        try {
            $response = Http::timeout(60)
                ->retry(2, 2000)
                ->get(self::API, ['slug' => $slug, '_embed' => 'wp:featuredmedia']);
        } catch (\Throwable $e) {
            $this->warn('  http error: '.$e->getMessage());

            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();

        return is_array($data) && isset($data[0]) ? $data[0] : null;
    }

    /**
     * Strip WordPress cruft, inline styles, and promo blocks; pull images into
     * the media library and rewrite their URLs to local /storage paths.
     */
    private function cleanContent(string $html, string $slug, string $title, int &$counter): string
    {
        // Remove shortcodes such as [gravityform ...].
        $html = preg_replace('/\[[^\]]*\]/u', '', $html) ?? $html;

        // Convert legacy Aparat / YouTube embeds to the site video player placeholder.
        $html = $this->convertLegacyVideos($html);

        // Drop script tags and elementor wrappers left from WordPress.
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? $html;

        if (trim(strip_tags($html)) === '' && ! str_contains($html, 'data-atrin-video')) {
            return '';
        }

        libxml_use_internal_errors(true);
        $dom = new \DOMDocument('1.0', 'UTF-8');
        $dom->loadHTML(
            '<?xml encoding="UTF-8"?><div id="__root">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD,
        );
        libxml_clear_errors();

        $xpath = new \DOMXPath($dom);
        $root = $dom->getElementById('__root');
        if (! $root) {
            return trim(strip_tags($html));
        }

        // 1) Rewrite / relocate images.
        foreach (iterator_to_array($xpath->query('.//img', $root)) as $img) {
            /** @var \DOMElement $img */
            $src = $img->getAttribute('src');
            $localPath = null;
            if ($src && str_contains($src, 'bahramrostami.ir')) {
                $counter++;
                $localPath = $this->downloadImage($src, $slug.'-'.$counter, $title);
            }

            if (! $localPath) {
                $img->parentNode?->removeChild($img);

                continue;
            }

            $alt = trim($img->getAttribute('alt')) ?: $title;
            while ($img->attributes->length > 0) {
                $img->removeAttribute($img->attributes->item(0)->nodeName);
            }
            $img->setAttribute('src', '/storage/'.$localPath);
            $img->setAttribute('alt', $alt);
        }

        // 2) Remove promotional paragraphs (external CTAs, contact/social links).
        foreach (iterator_to_array($xpath->query('.//p', $root)) as $p) {
            /** @var \DOMElement $p */
            $text = trim($p->textContent);
            $isPromo = str_contains($text, 'کلیک کنید') || str_contains($text, 'اطلاعت بیشتر');
            foreach ($xpath->query('.//a', $p) as $a) {
                $href = $a->getAttribute('href');
                if (Str::contains($href, ['instagram.com', 'rostami.vfx', 't.me', 'wa.me', 'whatsapp', '/contact', '/cart', 'bahramrostami.ir/تماس', 'bahramrostami.ir'])) {
                    $isPromo = true;
                }
            }
            if ($isPromo) {
                $p->parentNode?->removeChild($p);
            }
        }

        // 3) Drop a manual "عنوان ها" table of contents and its list.
        foreach (iterator_to_array($xpath->query('.//p', $root)) as $p) {
            $text = preg_replace('/\s+/u', '', $p->textContent);
            if (in_array($text, ['عنوانها', 'عناوین', 'فهرست', 'فهرستعناوین'], true)) {
                $next = $p->nextSibling;
                while ($next && $next->nodeType !== XML_ELEMENT_NODE) {
                    $next = $next->nextSibling;
                }
                if ($next && in_array(strtolower($next->nodeName), ['ul', 'ol'], true)) {
                    $next->parentNode?->removeChild($next);
                }
                $p->parentNode?->removeChild($p);
            }
        }

        // 4) Strip style/class/id and other presentational attributes (keep video embed attrs).
        foreach (iterator_to_array($xpath->query('.//*[@style or @class or @id or @dir]', $root)) as $el) {
            /** @var \DOMElement $el */
            if ($el->hasAttribute('data-atrin-video')) {
                continue;
            }
            foreach (['style', 'class', 'id', 'dir', 'align'] as $attr) {
                $el->removeAttribute($attr);
            }
        }

        // 5) Unwrap <span> and <b> (keep text / convert <b> to <strong> handled by purify).
        foreach (iterator_to_array($xpath->query('.//span', $root)) as $span) {
            $this->unwrap($span);
        }

        // 6) Remove empty paragraphs / list items (only whitespace or nbsp).
        foreach (iterator_to_array($xpath->query('.//p | .//li | .//div', $root)) as $el) {
            /** @var \DOMElement $el */
            if ($el->hasAttribute('data-atrin-video')) {
                continue;
            }
            $text = trim(str_replace("\u{00A0}", '', $el->textContent));
            if ($text === '' && $xpath->query('.//img | .//*[@data-atrin-video]', $el)->length === 0) {
                $el->parentNode?->removeChild($el);
            }
        }

        // Serialize inner HTML of the root wrapper.
        $out = '';
        foreach (iterator_to_array($root->childNodes) as $child) {
            $out .= $dom->saveHTML($child);
        }

        return trim($out);
    }

    /** Turn WordPress Aparat/YouTube embeds into data-atrin-video placeholders. */
    private function convertLegacyVideos(string $html): string
    {
        $html = preg_replace_callback(
            '/<script[^>]+src=["\']https?:\/\/www\.aparat\.com\/embed\/([a-zA-Z0-9]+)[^"\']*["\'][^>]*>\s*<\/script>/i',
            fn (array $m) => $this->videoPlaceholder(aparat: $m[1]),
            $html,
        ) ?? $html;

        $html = preg_replace_callback(
            '/<iframe[^>]+src=["\']https?:\/\/(?:www\.)?aparat\.com\/video\/video\/embed\/videohash\/([a-zA-Z0-9]+)[^"\']*["\'][^>]*>\s*<\/iframe>/i',
            fn (array $m) => $this->videoPlaceholder(aparat: $m[1]),
            $html,
        ) ?? $html;

        $html = preg_replace_callback(
            '/<iframe[^>]+src=["\']https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})[^"\']*["\'][^>]*>\s*<\/iframe>/i',
            fn (array $m) => $this->videoPlaceholder(youtube: $m[1]),
            $html,
        ) ?? $html;

        return $html;
    }

    private function videoPlaceholder(string $aparat = '', string $youtube = ''): string
    {
        $active = $aparat !== '' ? 'aparat' : 'youtube';

        return '<div data-atrin-video="true" class="atrin-video-embed"'
            .' data-youtube="'.htmlspecialchars($youtube, ENT_QUOTES, 'UTF-8').'"'
            .' data-aparat="'.htmlspecialchars($aparat, ENT_QUOTES, 'UTF-8').'"'
            .' data-direct=""'
            .' data-active="'.$active.'"></div>';
    }

    private function unwrap(\DOMElement $el): void
    {
        $parent = $el->parentNode;
        if (! $parent) {
            return;
        }
        while ($el->firstChild) {
            $parent->insertBefore($el->firstChild, $el);
        }
        $parent->removeChild($el);
    }

    private function closingCta(string $keyword): string
    {
        return '<p>برای یادگیری عمیق‌تر فروش و بازاریابی، مسیر '
            .'<a href="/course/campaign-writing">کمپین‌نویسی</a> را ببینید و '
            .'<a href="/insights">مقالات بیشتر</a> را در بلاگ بخوانید.</p>';
    }

    /**
     * Download an image into storage/app/public/media/site and register it in
     * the media library. Returns the disk-relative path (media/site/...) or null.
     */
    private function downloadImage(string $url, string $baseName, string $alt): ?string
    {
        $ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION));
        if (! in_array($ext, ['webp', 'jpg', 'jpeg', 'png', 'gif'], true)) {
            $ext = 'webp';
        }

        $filename = Str::slug($baseName).'.'.$ext;
        $relative = 'media/site/'.$filename;
        $absolute = storage_path('app/public/'.$relative);

        if (! File::exists($absolute)) {
            // Legacy uploads may exist under a different extension than the one
            // referenced (e.g. cover is .jpg but only .webp is served, or vice
            // versa), so try the original then each common variant.
            $base = preg_replace('/\.(webp|jpe?g|png|gif)$/i', '', $url);
            $candidates = array_values(array_unique(array_filter([
                $url,
                $base.'.webp',
                $base.'.jpg',
                $base.'.jpeg',
                $base.'.png',
            ])));

            $body = null;
            foreach ($candidates as $candidate) {
                try {
                    $response = Http::timeout(60)->retry(2, 2000)->get($candidate);
                } catch (\Throwable $e) {
                    continue;
                }
                if ($response->successful()) {
                    $body = $response->body();
                    $ext = strtolower(pathinfo(parse_url($candidate, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION)) ?: $ext;
                    $filename = Str::slug($baseName).'.'.$ext;
                    $relative = 'media/site/'.$filename;
                    $absolute = storage_path('app/public/'.$relative);
                    break;
                }
            }

            if ($body === null) {
                $this->warn('  image failed: '.$url);

                return null;
            }

            File::ensureDirectoryExists(dirname($absolute));
            File::put($absolute, $body);
        }

        Media::query()->updateOrCreate(
            ['path' => $relative],
            [
                'disk' => 'public',
                'url' => '/storage/'.$relative,
                'type' => 'image',
                'mime' => match ($ext) {
                    'webp' => 'image/webp',
                    'png' => 'image/png',
                    'gif' => 'image/gif',
                    default => 'image/jpeg',
                },
                'size' => File::exists($absolute) ? File::size($absolute) : null,
                'alt_fa' => $alt,
                'original_filename' => $filename,
                'category' => 'بلاگ',
                'is_private' => false,
            ],
        );

        return $relative;
    }

    private function persianDigits(int|string $value): string
    {
        return str_replace(
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
            (string) $value,
        );
    }
}
