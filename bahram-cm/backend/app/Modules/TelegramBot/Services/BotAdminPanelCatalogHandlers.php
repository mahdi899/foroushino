<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\Seminar;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Enums\BotAdminPermission;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramConversation;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Services\ContentPublishService;
use App\Services\ReferenceChannelProductService;
use App\Services\SeminarProductService;
use App\Services\TelegramHostCatalogRevision;
use Illuminate\Support\Carbon;
use RuntimeException;

/**
 * Admin hubs: کانال مرجع، دوره‌ها، سمینارها (محتوا + قیمت + کاور).
 *
 * @property BotMessageCatalog $messageCatalog
 * @property ConversationService $conversations
 */
trait BotAdminPanelCatalogHandlers
{
    private function assertCatalogEditor(TelegramAccount $account): void
    {
        if (! $account->hasBotAdminPermission(BotAdminPermission::Messages)) {
            throw new RuntimeException('دسترسی ویرایش محتوا/کاتالوگ ندارید.');
        }
    }

    private function resolveEditableReferenceChannel(): ReferenceChannel
    {
        $channel = ReferenceChannel::query()
            ->where('status', 'published')
            ->whereNotNull('product_id')
            ->orderByDesc('id')
            ->first()
            ?? ReferenceChannel::query()->orderByDesc('id')->first();

        if ($channel === null) {
            throw new RuntimeException('کانال مرجعی در سیستم ثبت نشده است.');
        }

        return $channel;
    }

    private function bumpTelegramCatalog(?string $productSlug = null): void
    {
        // Revision first; host push runs afterResponse (see PushTelegramHostSyncJob)
        // so it does not deadlock the single-threaded local host during process-update.
        app(TelegramHostCatalogRevision::class)->bump(scope: 'all');

        if ($productSlug) {
            app(ContentPublishService::class)->revalidateProducts($productSlug);
        }
    }

    private function formatToman(int $amount): string
    {
        return number_format($amount).' تومان';
    }

    // —— Reference channel hub ——

    private function openReferenceChannelSection(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId = 0,
    ): void {
        $this->assertCatalogEditor($account);
        $channel = $this->resolveEditableReferenceChannel();
        $status = $channel->status === 'published' ? 'منتشر شده' : 'پیش‌نویس';
        $tg = ($channel->show_in_telegram ?? true) ? 'بله' : 'خیر';

        $text = "🛠 <b>ویرایش کانال مرجع</b>\n"
            ."<i>پنل ادمین — این متن را کاربران عادی نمی‌بینند.</i>\n"
            ."──────────────\n"
            .'عنوان: '.TelegramHtml::escape($channel->title)."\n"
            .'قیمت: '.$this->formatToman((int) $channel->price)."\n"
            ."وضعیت: {$status}\n"
            ."نمایش در تلگرام: {$tg}\n\n"
            .'از دکمه‌های زیر برای ویرایش محتوا/قیمت استفاده کنید.';

        $keyboard = [
            [
                ['text' => '✏️ عنوان', 'callback_data' => 'admin:ref:title'],
                ['text' => '💰 قیمت', 'callback_data' => 'admin:ref:price'],
            ],
            [
                ['text' => '📝 توضیح (متن کانال)', 'callback_data' => 'admin:ref:desc'],
                ['text' => '🖼 کاور', 'callback_data' => 'admin:ref:cover'],
            ],
            [
                ['text' => '💬 پیام‌های ربات', 'callback_data' => 'admin:ref:msg'],
                ['text' => '📢 وضعیت انتشار', 'callback_data' => 'admin:ref:status'],
            ],
            [['text' => '📲 نمایش در تلگرام', 'callback_data' => 'admin:ref:tgtg']],
            [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleReferenceChannelCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $this->assertCatalogEditor($account);
        $action = explode(':', $data)[2] ?? 'h';

        if ($action === 'cover') {
            $this->beginReferenceChannelCoverFlow($bot, $account, $client, $chatId);

            return;
        }

        if ($action === 'msg') {
            $this->openMessagesSection($bot, $account, $client, $chatId, $messageId, 0, 'کانال مرجع');

            return;
        }

        if ($action === 'status') {
            $channel = $this->resolveEditableReferenceChannel();
            $channel->forceFill([
                'status' => $channel->status === 'published' ? 'draft' : 'published',
            ])->save();
            app(ReferenceChannelProductService::class)->syncProduct($channel->fresh());
            $this->bumpTelegramCatalog();
            $this->openReferenceChannelSection($bot, $account, $client, $chatId, $messageId);

            return;
        }

        if ($action === 'tgtg') {
            $channel = $this->resolveEditableReferenceChannel();
            $channel->forceFill([
                'show_in_telegram' => ! (bool) ($channel->show_in_telegram ?? true),
            ])->save();
            app(ReferenceChannelProductService::class)->syncProduct($channel->fresh());
            $this->bumpTelegramCatalog();
            $this->openReferenceChannelSection($bot, $account, $client, $chatId, $messageId);

            return;
        }

        if (in_array($action, ['title', 'price', 'desc'], true)) {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'ref_'.$action, 'draft' => []],
            ]);
            $prompts = [
                'title' => 'عنوان جدید کانال مرجع را بنویسید:',
                'price' => 'قیمت جدید (تومان، فقط عدد) را بنویسید:',
                'desc' => 'توضیح کانال مرجع (متن سایت/پنل) را بنویسید:',
            ];
            $client->sendMessage($chatId, $prompts[$action]."\n\nبرای انصراف «لغو».", [
                'reply_markup' => [
                    'keyboard' => [[['text' => 'لغو']]],
                    'resize_keyboard' => true,
                ],
            ]);

            return;
        }

        $this->openReferenceChannelSection($bot, $account, $client, $chatId, $messageId);
    }

    private function onReferenceChannelFieldInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
        string $field,
    ): void {
        $channel = $this->resolveEditableReferenceChannel();
        $value = trim($text);

        if ($field === 'title') {
            if ($value === '') {
                throw new RuntimeException('عنوان خالی است.');
            }
            $channel->forceFill(['title' => mb_substr($value, 0, 255)])->save();
        } elseif ($field === 'price') {
            $digits = preg_replace('/[^\d]/', '', $value) ?? '';
            if ($digits === '') {
                throw new RuntimeException('قیمت نامعتبر است.');
            }
            $channel->forceFill(['price' => (int) $digits])->save();
        } elseif ($field === 'desc') {
            $channel->forceFill(['description' => mb_substr($value, 0, 8000) ?: null])->save();
        }

        app(ReferenceChannelProductService::class)->syncProduct($channel->fresh());
        $this->bumpTelegramCatalog();

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $client->sendMessage($chatId, '✅ کانال مرجع به‌روز شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    // —— Courses ——

    /** @return \Illuminate\Database\Eloquent\Collection<int, Product> */
    private function adminCourseProducts()
    {
        return Product::query()
            ->whereDoesntHave('seminar')
            ->whereDoesntHave('referenceChannel')
            ->orderByDesc('id')
            ->limit(40)
            ->get();
    }

    private function openCoursesSection(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId = 0,
    ): void {
        $this->assertCatalogEditor($account);
        $products = $this->adminCourseProducts();

        $text = "🛠 <b>ویرایش دوره‌ها</b>\n"
            ."<i>پنل ادمین — لیست خرید کاربران جداست.</i>\n"
            ."──────────────\n"
            ."یک دوره را برای ویرایش قیمت، عنوان، کاور و تنظیمات تلگرام انتخاب کنید.\n"
            .'پیام‌های لیست دوره: «پیام‌ها → خرید».';

        $keyboard = [];
        foreach ($products as $product) {
            $mark = $product->is_active ? '✅' : '⛔';
            $keyboard[] = [[
                'text' => $mark.' #'.$product->id.' '.mb_substr((string) $product->title, 0, 28),
                'callback_data' => 'admin:crs:i:'.$product->id,
            ]];
        }
        if ($products->isEmpty()) {
            $keyboard[] = [['text' => 'دوره‌ای ثبت نشده', 'callback_data' => 'admin:h']];
        }
        $keyboard[] = [
            ['text' => '💬 پیام‌های دوره‌ها', 'callback_data' => 'admin:crs:msg'],
        ];
        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleCoursesCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $this->assertCatalogEditor($account);
        $parts = explode(':', $data);
        $action = $parts[2] ?? 'list';

        if ($action === 'msg') {
            $this->openMessagesSection($bot, $account, $client, $chatId, $messageId, 0, 'خرید');

            return;
        }

        if ($action === 'list') {
            $this->openCoursesSection($bot, $account, $client, $chatId, $messageId);

            return;
        }

        if ($action === 'i') {
            $productId = (int) ($parts[3] ?? 0);
            $this->renderCourseDetail($bot, $account, $client, $chatId, $messageId, $productId);

            return;
        }

        if (in_array($action, ['title', 'price', 'sale', 'photo'], true)) {
            $productId = (int) ($parts[3] ?? 0);
            $product = Product::query()->whereKey($productId)->first();
            if ($product === null) {
                throw new RuntimeException('دوره یافت نشد.');
            }

            if ($action === 'photo') {
                $conversation = $this->conversations->forAccount($account);
                $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                    'admin' => ['flow' => 'product_photo', 'draft' => ['product_id' => $product->id]],
                ]);
                $client->sendMessage($chatId, '🖼 عکس بنر دوره «'.$product->title."» را بفرستید.\n«لغو» برای انصراف.", [
                    'reply_markup' => [
                        'keyboard' => [[['text' => 'لغو']]],
                        'resize_keyboard' => true,
                    ],
                ]);

                return;
            }

            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'crs_'.$action, 'draft' => ['product_id' => $product->id]],
            ]);
            $prompts = [
                'title' => 'عنوان جدید دوره:',
                'price' => 'قیمت اصلی (تومان، فقط عدد):',
                'sale' => 'قیمت فروش / تخفیف (تومان؛ برای حذف /null بفرستید):',
            ];
            $client->sendMessage($chatId, $prompts[$action]."\n«لغو» برای انصراف.", [
                'reply_markup' => [
                    'keyboard' => [[['text' => 'لغو']]],
                    'resize_keyboard' => true,
                ],
            ]);

            return;
        }

        if (in_array($action, ['act', 'tgtg'], true)) {
            $productId = (int) ($parts[3] ?? 0);
            $product = Product::query()->whereKey($productId)->first();
            if ($product === null) {
                throw new RuntimeException('دوره یافت نشد.');
            }
            if ($action === 'act') {
                $product->forceFill(['is_active' => ! $product->is_active])->save();
            } else {
                $product->forceFill(['show_in_telegram' => ! $product->show_in_telegram])->save();
            }
            $this->bumpTelegramCatalog();
            $this->renderCourseDetail($bot, $account, $client, $chatId, $messageId, $productId);

            return;
        }

        $this->openCoursesSection($bot, $account, $client, $chatId, $messageId);
    }

    private function renderCourseDetail(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        int $productId,
    ): void {
        $product = Product::query()->whereKey($productId)->first();
        if ($product === null) {
            throw new RuntimeException('دوره یافت نشد.');
        }

        $sale = $product->sale_price !== null
            ? $this->formatToman((int) $product->sale_price)
            : '—';

        $text = "🎓 <b>".TelegramHtml::escape((string) $product->title)."</b>\n\n"
            .'قیمت: '.$this->formatToman((int) $product->price)."\n"
            ."قیمت فروش: {$sale}\n"
            .'فعال: '.($product->is_active ? 'بله' : 'خیر')."\n"
            .'نمایش در تلگرام: '.($product->show_in_telegram ? 'بله' : 'خیر');

        $id = $product->id;
        $keyboard = [
            [
                ['text' => '✏️ عنوان', 'callback_data' => 'admin:crs:title:'.$id],
                ['text' => '💰 قیمت', 'callback_data' => 'admin:crs:price:'.$id],
            ],
            [
                ['text' => '🏷 قیمت فروش', 'callback_data' => 'admin:crs:sale:'.$id],
                ['text' => '🖼 کاور', 'callback_data' => 'admin:crs:photo:'.$id],
            ],
            [
                ['text' => $product->is_active ? '⛔ غیرفعال' : '✅ فعال', 'callback_data' => 'admin:crs:act:'.$id],
                ['text' => '📲 تلگرام', 'callback_data' => 'admin:crs:tgtg:'.$id],
            ],
            [
                ['text' => '◀️ لیست دوره‌ها', 'callback_data' => 'admin:crs:list'],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function onCourseFieldInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
        string $field,
    ): void {
        $productId = (int) data_get($conversation->context, 'admin.draft.product_id');
        $product = Product::query()->whereKey($productId)->first();
        if ($product === null) {
            throw new RuntimeException('دوره یافت نشد.');
        }

        $value = trim($text);
        if ($field === 'title') {
            if ($value === '') {
                throw new RuntimeException('عنوان خالی است.');
            }
            $product->forceFill(['title' => mb_substr($value, 0, 255)])->save();
        } elseif ($field === 'price') {
            $digits = preg_replace('/[^\d]/', '', $value) ?? '';
            if ($digits === '') {
                throw new RuntimeException('قیمت نامعتبر است.');
            }
            $product->forceFill(['price' => (int) $digits])->save();
        } elseif ($field === 'sale') {
            if ($this->isDiscountNullCommand($value)) {
                $product->forceFill(['sale_price' => null])->save();
            } else {
                $digits = preg_replace('/[^\d]/', '', $value) ?? '';
                if ($digits === '') {
                    throw new RuntimeException('قیمت فروش نامعتبر است.');
                }
                $product->forceFill(['sale_price' => (int) $digits])->save();
            }
        }

        $this->bumpTelegramCatalog($product->slug);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ دوره به‌روز شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    // —— Seminars ——

    /** @return \Illuminate\Database\Eloquent\Collection<int, Seminar> */
    private function adminSeminars()
    {
        return Seminar::query()->with('product')->orderByDesc('id')->limit(30)->get();
    }

    private function openSeminarsSection(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId = 0,
    ): void {
        $this->assertCatalogEditor($account);
        $seminars = $this->adminSeminars();

        $text = "🛠 <b>ویرایش سمینارها</b>\n"
            ."<i>پنل ادمین — کاربران از منوی اصلی سمینارها را می‌بینند.</i>\n"
            ."──────────────\n"
            ."قیمت، ظرفیت، مکان، تاریخ و تخفیف کانال مرجع را از اینجا ویرایش کنید.";

        $keyboard = [];
        foreach ($seminars as $seminar) {
            $mark = $seminar->status === 'published' ? '✅' : '⛔';
            $keyboard[] = [[
                'text' => $mark.' #'.$seminar->id.' '.mb_substr((string) $seminar->title, 0, 28),
                'callback_data' => 'admin:sem:i:'.$seminar->id,
            ]];
        }
        if ($seminars->isEmpty()) {
            $keyboard[] = [['text' => 'سمیناری ثبت نشده', 'callback_data' => 'admin:h']];
        }
        $keyboard[] = [['text' => '💬 پیام‌های سمینار', 'callback_data' => 'admin:sem:msg']];
        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleSeminarsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $this->assertCatalogEditor($account);
        $parts = explode(':', $data);
        $action = $parts[2] ?? 'list';

        if ($action === 'msg') {
            $this->openMessagesSection($bot, $account, $client, $chatId, $messageId, 0, 'خرید');

            return;
        }

        if ($action === 'list') {
            $this->openSeminarsSection($bot, $account, $client, $chatId, $messageId);

            return;
        }

        if ($action === 'i') {
            $this->renderSeminarDetail($bot, $account, $client, $chatId, $messageId, (int) ($parts[3] ?? 0));

            return;
        }

        $seminarId = (int) ($parts[3] ?? 0);
        $seminar = Seminar::query()->whereKey($seminarId)->first();
        if ($seminar === null) {
            throw new RuntimeException('سمینار یافت نشد.');
        }

        if ($action === 'status') {
            $seminar->forceFill([
                'status' => $seminar->status === 'published' ? 'draft' : 'published',
            ])->save();
            app(SeminarProductService::class)->syncProduct($seminar->fresh());
            $this->bumpTelegramCatalog();
            $this->renderSeminarDetail($bot, $account, $client, $chatId, $messageId, $seminarId);

            return;
        }

        if ($action === 'photo') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'seminar_photo', 'draft' => ['seminar_id' => $seminarId]],
            ]);
            $client->sendMessage($chatId, '🖼 کاور سمینار را بفرستید یا «لغو».', [
                'reply_markup' => [
                    'keyboard' => [[['text' => 'لغو']]],
                    'resize_keyboard' => true,
                ],
            ]);

            return;
        }

        $flowMap = [
            'title' => 'sem_title',
            'price' => 'sem_price',
            'sale' => 'sem_sale',
            'cap' => 'sem_cap',
            'loc' => 'sem_loc',
            'date' => 'sem_date',
            'refdisc' => 'sem_refdisc',
        ];

        if (isset($flowMap[$action])) {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => $flowMap[$action], 'draft' => ['seminar_id' => $seminarId]],
            ]);
            $prompts = [
                'sem_title' => 'عنوان سمینار:',
                'sem_price' => 'قیمت (تومان):',
                'sem_sale' => 'قیمت فروش (یا /null):',
                'sem_cap' => 'ظرفیت (عدد؛ ۰ = نامحدود):',
                'sem_loc' => 'مکان برگزاری:',
                'sem_date' => 'تاریخ و ساعت (مثال: 1404-08-15 18:00):',
                'sem_refdisc' => 'مبلغ تخفیف کانال مرجع برای شرکت‌کننده (تومان):',
            ];
            $client->sendMessage($chatId, $prompts[$flowMap[$action]]."\n«لغو» برای انصراف.", [
                'reply_markup' => [
                    'keyboard' => [[['text' => 'لغو']]],
                    'resize_keyboard' => true,
                ],
            ]);

            return;
        }

        $this->openSeminarsSection($bot, $account, $client, $chatId, $messageId);
    }

    private function renderSeminarDetail(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        int $seminarId,
    ): void {
        $seminar = Seminar::query()->whereKey($seminarId)->first();
        if ($seminar === null) {
            throw new RuntimeException('سمینار یافت نشد.');
        }

        $date = $seminar->date?->format('Y-m-d H:i') ?? '—';
        $cap = $seminar->capacity !== null ? (string) $seminar->capacity : 'نامحدود';
        $refDisc = $seminar->reference_discount_amount !== null
            ? $this->formatToman((int) $seminar->reference_discount_amount)
            : '—';

        $text = "🎤 <b>".TelegramHtml::escape((string) $seminar->title)."</b>\n\n"
            .'قیمت: '.$this->formatToman((int) $seminar->price)."\n"
            .'فروش: '.($seminar->sale_price !== null ? $this->formatToman((int) $seminar->sale_price) : '—')."\n"
            ."تاریخ: {$date}\n"
            .'مکان: '.TelegramHtml::escape((string) ($seminar->location ?: '—'))."\n"
            ."ظرفیت: {$cap}\n"
            ."تخفیف کانال مرجع: {$refDisc}\n"
            .'وضعیت: '.($seminar->status === 'published' ? 'منتشر' : 'پیش‌نویس');

        $id = $seminar->id;
        $keyboard = [
            [
                ['text' => '✏️ عنوان', 'callback_data' => 'admin:sem:title:'.$id],
                ['text' => '💰 قیمت', 'callback_data' => 'admin:sem:price:'.$id],
            ],
            [
                ['text' => '🏷 فروش', 'callback_data' => 'admin:sem:sale:'.$id],
                ['text' => '📅 تاریخ', 'callback_data' => 'admin:sem:date:'.$id],
            ],
            [
                ['text' => '📍 مکان', 'callback_data' => 'admin:sem:loc:'.$id],
                ['text' => '👥 ظرفیت', 'callback_data' => 'admin:sem:cap:'.$id],
            ],
            [
                ['text' => '🎁 تخفیف کانال مرجع', 'callback_data' => 'admin:sem:refdisc:'.$id],
                ['text' => '🖼 کاور', 'callback_data' => 'admin:sem:photo:'.$id],
            ],
            [['text' => '📢 وضعیت انتشار', 'callback_data' => 'admin:sem:status:'.$id]],
            [
                ['text' => '◀️ لیست', 'callback_data' => 'admin:sem:list'],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function onSeminarFieldInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
        string $flow,
    ): void {
        $seminarId = (int) data_get($conversation->context, 'admin.draft.seminar_id');
        $seminar = Seminar::query()->whereKey($seminarId)->first();
        if ($seminar === null) {
            throw new RuntimeException('سمینار یافت نشد.');
        }

        $value = trim($text);

        match ($flow) {
            'sem_title' => $seminar->forceFill(['title' => mb_substr($value, 0, 255)])->save(),
            'sem_price' => $seminar->forceFill(['price' => $this->parseTomanInput($value)])->save(),
            'sem_sale' => $seminar->forceFill([
                'sale_price' => $this->isDiscountNullCommand($value) ? null : $this->parseTomanInput($value),
            ])->save(),
            'sem_cap' => $seminar->forceFill([
                'capacity' => max(0, (int) (preg_replace('/[^\d]/', '', $value) ?? '0')),
            ])->save(),
            'sem_loc' => $seminar->forceFill(['location' => mb_substr($value, 0, 500) ?: null])->save(),
            'sem_date' => $seminar->forceFill(['date' => $this->parseSeminarDate($value)])->save(),
            'sem_refdisc' => $seminar->forceFill(['reference_discount_amount' => $this->parseTomanInput($value)])->save(),
            default => throw new RuntimeException('فیلد نامعتبر.'),
        };

        app(SeminarProductService::class)->syncProduct($seminar->fresh());
        $this->bumpTelegramCatalog();

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ سمینار به‌روز شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    private function parseTomanInput(string $value): int
    {
        $digits = preg_replace('/[^\d]/', '', $value) ?? '';
        if ($digits === '') {
            throw new RuntimeException('مبلغ نامعتبر است.');
        }

        return (int) $digits;
    }

    private function parseSeminarDate(string $value): Carbon
    {
        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            throw new RuntimeException('تاریخ نامعتبر است.');
        }
    }

    public function handleCatalogProductPhoto(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $fileId,
    ): bool {
        $productId = (int) data_get($conversation->context, 'admin.draft.product_id');
        $product = Product::query()->whereKey($productId)->first();
        if ($product === null) {
            throw new RuntimeException('دوره یافت نشد.');
        }

        $coverRef = $this->storeTelegramPhotoAsPublicMedia($bot, $account, $client, $fileId, 'کاور دوره', 'دوره‌ها');

        $product->forceFill([
            'featured_image' => $coverRef,
            'telegram_photo_file_id' => $fileId,
            'telegram_photo_source' => $coverRef,
        ])->save();

        $this->bumpTelegramCatalog();
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ کاور دوره ذخیره شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);

        return true;
    }

    public function handleCatalogSeminarPhoto(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $fileId,
    ): bool {
        $seminarId = (int) data_get($conversation->context, 'admin.draft.seminar_id');
        $seminar = Seminar::query()->whereKey($seminarId)->first();
        if ($seminar === null) {
            throw new RuntimeException('سمینار یافت نشد.');
        }

        $coverRef = $this->storeTelegramPhotoAsPublicMedia($bot, $account, $client, $fileId, 'کاور سمینار', 'سمینار');

        $seminar->forceFill([
            'cover_image' => $coverRef,
            'telegram_photo_file_id' => $fileId,
            'telegram_photo_source' => $coverRef,
        ])->save();

        app(SeminarProductService::class)->syncProduct($seminar->fresh());
        $this->bumpTelegramCatalog();

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ کاور سمینار ذخیره شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);

        return true;
    }

    private function storeTelegramPhotoAsPublicMedia(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        string $fileId,
        string $alt,
        string $category,
    ): string {
        $file = $client->getFile($fileId);
        $filePath = $file['file_path'] ?? null;
        if (! is_string($filePath) || $filePath === '') {
            throw new RuntimeException('دریافت فایل از تلگرام ناموفق بود.');
        }

        $bytes = $client->downloadFile($filePath);
        $tmp = tempnam(sys_get_temp_dir(), 'tg_catalog_');
        if ($tmp === false) {
            throw new RuntimeException('فایل موقت ناموفق بود.');
        }
        $jpgPath = $tmp.'.jpg';
        file_put_contents($jpgPath, $bytes);
        @unlink($tmp);

        try {
            $uploaded = new \Illuminate\Http\UploadedFile(
                $jpgPath,
                'catalog-cover.jpg',
                'image/jpeg',
                null,
                true,
            );

            $media = app(\App\Services\MediaService::class)->storePublic(
                $uploaded,
                alt: $alt,
                userId: $account->user_id ? (int) $account->user_id : null,
                category: $category,
            );

            return \App\Support\MediaUrl::fromDiskPath($media->path)
                ?? \App\Support\MediaUrl::reference('/storage/'.$media->path)
                ?? '/storage/'.$media->path;
        } finally {
            if (is_file($jpgPath)) {
                @unlink($jpgPath);
            }
        }
    }
}
