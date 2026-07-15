<?php

namespace Database\Seeders;

use App\Actions\Family\JoinFamily;
use App\Enums\Family\FamilyActionType;
use App\Enums\Family\FamilyCommentRejectionReason;
use App\Enums\Family\FamilyCommentStatus;
use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostBlockType;
use App\Enums\Family\FamilyPostStatus;
use App\Enums\Family\FamilyPostType;
use App\Enums\Family\FamilyReactionType;
use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Models\Article;
use App\Models\FamilyAction;
use App\Models\FamilyActionResponse;
use App\Models\FamilyComment;
use App\Models\FamilyMedia;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\FamilyBranding;
use App\Models\FamilyStory;
use App\Models\FamilyReaction;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Family\FamilyPostPublisher;
use App\Services\Family\FamilyStatsService;
use Database\Seeders\Support\FamilyDemoAssets;
use Database\Seeders\Support\FamilyDemoPostLookup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * دمو کامل «خانواده داداش بهرام» — همهٔ نوع پست، اکشن، تعامل و رسانه.
 * Idempotent: هر آیتم با data.demo_key شناسایی می‌شود.
 */
class FamilySeeder extends Seeder
{
    private const PRIMARY_MEMBER_MOBILE = '09145416413';

    private const PRIMARY_MEMBER_PASSWORD = '12345';

    /** @var list<array{mobile: string, name: string, password: string}> */
    private const EXTRA_MEMBERS = [
        ['mobile' => '09145416414', 'name' => 'سارا (دمو)', 'password' => '12345'],
        ['mobile' => '09145416415', 'name' => 'امیر (دمو)', 'password' => '12345'],
    ];

    public function run(): void
    {
        $this->retireLegacyTextOnlyPosts();

        $author = $this->resolveBahramAuthor();
        $members = $this->seedMembers();
        $familyId = (int) (FamilyMembership::query()->where('user_id', $members[0]->id)->value('family_id') ?? 0);

        $assets = (new FamilyDemoAssets)->deploy($author);
        $article = $this->seedDemoArticle($author);

        /** @var FamilyPostPublisher $publisher */
        $publisher = app(FamilyPostPublisher::class);

        $welcome = $this->publishDemoPost($publisher, $author, 'welcome-text', [
            'type' => FamilyPostType::Text->value,
            'audience_mode' => FamilyPostAudienceMode::All->value,
            'is_important' => true,
            'blocks' => [
                $this->textBlock(
                    'سلام خانواده! من بهرام هستم. خوشحالم که اینجا هستید — از امروز هر هفته اینجا با هم حرف می‌زنیم و مسیر رشد را جلو می‌بریم.',
                    'welcome-text',
                ),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'weekly-focus', [
            'type' => FamilyPostType::Text->value,
            'blocks' => [
                $this->textBlock(
                    'یادتون باشه: پیشرفت واقعی از اقدام کوچک و مداوم شروع می‌شه. این هفته یک کار کوچک انتخاب کنید و انجامش بدید — بعد توی کامنت‌ها برام بنویسید.',
                    'weekly-focus',
                ),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'voice-podcast', [
            'type' => FamilyPostType::Voice->value,
            'is_important' => true,
            'blocks' => [
                $this->textBlock('🎙️ پادکست این هفته: دربارهٔ تمرکز عمیق و حذف حواس‌پرتی — گوش کن و نظرت رو بنویس.', 'voice-podcast', 0),
                $this->audioBlock($assets['voice'], 1),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'video-message', [
            'type' => FamilyPostType::Video->value,
            'blocks' => [
                $this->textBlock('پیام ویدیویی کوتاه از بهرام — یک نکتهٔ عملی برای امروز.', 'video-message', 0),
                $this->videoBlock($assets['video'], 1),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'video-vertical-portrait', [
            'type' => FamilyPostType::Video->value,
            'blocks' => [
                $this->textBlock('ویدیوی عمودی ۹:۱۶ — تست نمایش در فید (مثل استوری/ریels).', 'video-vertical-portrait', 0),
                $this->videoBlock($assets['videoVertical'], 1),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'image-moment', [
            'type' => FamilyPostType::Image->value,
            'blocks' => [
                $this->textBlock('لحظه‌ای از پشت صحنهٔ کار — گاهی مسیر، مهم‌تر از مقصد است.', 'image-moment', 0),
                $this->imageBlock($assets['image1'], 1),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'image-album-journey', [
            'type' => FamilyPostType::ImageAlbum->value,
            'blocks' => [
                $this->textBlock('آلبوم این هفته: سه لحظه از مسیر رشد خانواده.', 'image-album-journey', 0),
                $this->imageBlock($assets['image1'], 1),
                $this->imageBlock($assets['image2'], 2),
                $this->imageBlock($assets['image3'], 3),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'article-insight', [
            'type' => FamilyPostType::Article->value,
            'blocks' => [
                $this->textBlock('مقالهٔ پیشنهادی این هفته — عمیق‌تر بخون و برام نظر بده.', 'article-insight', 0),
                $this->articleBlock($article, 1),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'mixed-weekly-recap', [
            'type' => FamilyPostType::Mixed->value,
            'blocks' => [
                $this->textBlock('خلاصهٔ هفته (ترکیبی): متن + صوت + عکس — همه با هم.', 'mixed-weekly-recap', 0),
                $this->audioBlock($assets['voice'], 1),
                $this->imageBlock($assets['image2'], 2),
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'action-commitment', [
            'type' => FamilyPostType::Text->value,
            'blocks' => [
                $this->textBlock('این هفته یک تعهد کوچک بردار — دکمهٔ زیر رو بزن.', 'action-commitment', 0),
            ],
            'action' => [
                'type' => FamilyActionType::Commitment->value,
                'prompt' => 'آیا متعهد می‌شی این هفته هر روز ۲۰ دقیقه روی یک هدف تمرکز کنی؟',
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'action-confirmation', [
            'type' => FamilyPostType::Text->value,
            'blocks' => [
                $this->textBlock('بررسی سریع: تمرین دیروز رو انجام دادی؟', 'action-confirmation', 0),
            ],
            'action' => [
                'type' => FamilyActionType::Confirmation->value,
                'prompt' => 'تمرین دیروز رو انجام دادی؟',
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'action-poll', [
            'type' => FamilyPostType::Text->value,
            'blocks' => [
                $this->textBlock('نظرسنجی: بزرگ‌ترین چالش این هفته‌ات چی بود؟', 'action-poll', 0),
            ],
            'action' => [
                'type' => FamilyActionType::SingleChoice->value,
                'prompt' => 'بزرگ‌ترین چالش این هفته‌ات چی بود؟',
                'options' => [
                    ['label' => 'تمرکز و حواس‌پرتی', 'value' => 'focus'],
                    ['label' => 'مدیریت زمان', 'value' => 'time'],
                    ['label' => 'انگیزه و ثبات', 'value' => 'motivation'],
                    ['label' => 'فروش و مذاکره', 'value' => 'sales'],
                ],
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'action-scale', [
            'type' => FamilyPostType::Text->value,
            'blocks' => [
                $this->textBlock('از ۱ تا ۱۰، امروز چقدر احساس پیشرفت کردی؟', 'action-scale', 0),
            ],
            'action' => [
                'type' => FamilyActionType::Scale->value,
                'prompt' => 'احساس پیشرفت امروزت چند از ۱۰ است؟',
                'config' => ['min' => 1, 'max' => 10],
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'action-number', [
            'type' => FamilyPostType::Text->value,
            'blocks' => [
                $this->textBlock('عدد بگو: چند دقیقه امروز روی هدف اصلی‌ات کار کردی؟', 'action-number', 0),
            ],
            'action' => [
                'type' => FamilyActionType::Number->value,
                'prompt' => 'چند دقیقه امروز روی هدف اصلی‌ات کار کردی؟',
                'config' => ['min' => 0, 'max' => 600],
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'action-short-text', [
            'type' => FamilyPostType::Text->value,
            'blocks' => [
                $this->textBlock('یک جمله بنویس: امروز چی یاد گرفتی؟', 'action-short-text', 0),
            ],
            'action' => [
                'type' => FamilyActionType::ShortText->value,
                'prompt' => 'امروز مهم‌ترین چیزی که یاد گرفتی چی بود؟',
            ],
        ]);

        $this->publishDemoPost($publisher, $author, 'action-multi-choice', [
            'type' => FamilyPostType::Text->value,
            'blocks' => [
                $this->textBlock('چندتایی انتخاب کن: کدوم حوزه‌ها این هفته برات اولویت بود؟', 'action-multi-choice', 0),
            ],
            'action' => [
                'type' => FamilyActionType::MultiChoice->value,
                'prompt' => 'کدوم حوزه‌ها این هفته برات اولویت بود؟ (چندتا انتخاب کن)',
                'options' => [
                    ['label' => 'فروش', 'value' => 'sales'],
                    ['label' => 'بازاریابی', 'value' => 'marketing'],
                    ['label' => 'رهبری تیم', 'value' => 'leadership'],
                    ['label' => 'سلامت و انرژی', 'value' => 'health'],
                ],
            ],
        ]);

        $engagement = $this->seedEngagement($welcome, $members, $author, $familyId);
        $this->seedReplyPost($publisher, $author, $engagement['approved_comment']);

        $this->seedActionResponses($members, $familyId);

        $this->pinImagePostsToFeedTop();
        $this->spreadDemoFeedTimeline();

        $this->call(FamilyBrandingSeeder::class);
        $this->call(FamilyPinnedPostSeeder::class);
        $this->call(FamilyStorySeeder::class);

        $this->printSummary($members, $familyId);
    }

    /** حذف ۴ پست متنی قدیمی سیدر اولیه (بدون demo_key) */
    private function retireLegacyTextOnlyPosts(): void
    {
        $legacyTexts = [
            'سلام خانواده! من بهرام هستم. خوشحالم که اینجا هستید — از امروز هر هفته اینجا با هم حرف می‌زنیم و مسیر رشد را جلو می‌بریم.',
            'یادتون باشه: پیشرفت واقعی از اقدام کوچک و مداوم شروع می‌شه. این هفته یک کار کوچک انتخاب کنید و انجامش بدید — بعد توی کامنت‌ها برام بنویسید.',
            'امروز می‌خوام درباره «تمرکز» حرف بزنم. وقتی ذهنت شلوغه، یک کار را انتخاب کن و فقط همان را تا آخر انجام بده. ساده به نظر می‌رسد، ولی نتیجه‌اش عجیب است.',
            'سؤال این هفته: بزرگ‌ترین چالشی که الان توی کسب‌وکارت یا مسیر رشدت داری چیه؟ توی کامنت‌ها بنویس — من و بقیه خانواده کنارت هستیم.',
        ];

        FamilyPost::query()
            ->where('type', FamilyPostType::Text->value)
            ->whereDoesntHave('blocks', fn ($q) => $q->whereNotNull('data->demo_key'))
            ->whereHas('blocks', fn ($q) => $q->whereIn('text_content', $legacyTexts))
            ->each(fn (FamilyPost $post) => $post->delete());
    }

    /** @return list<User> */
    private function seedMembers(): array
    {
        $primary = $this->upsertMember(self::PRIMARY_MEMBER_MOBILE, 'عضو تست خانواده', self::PRIMARY_MEMBER_PASSWORD);
        $members = [$primary];

        foreach (self::EXTRA_MEMBERS as $row) {
            $members[] = $this->upsertMember($row['mobile'], $row['name'], $row['password']);
        }

        return $members;
    }

    private function upsertMember(string $mobile, string $name, string $password): User
    {
        $user = User::query()->updateOrCreate(
            ['mobile' => $mobile],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'status' => 'active',
                'is_admin' => false,
                'is_sat_staff' => false,
                'mobile_verified_at' => now(),
            ],
        );

        UserIdentityProfile::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'uuid' => (string) Str::uuid(),
                'identity_status' => IdentityVerificationStatus::NotStarted,
                'verification_level' => 1,
                'mobile_ownership_status' => MobileOwnershipStatus::NotStarted,
                'ownership_failed_attempts' => 0,
            ],
        );

        $membership = app(JoinFamily::class)($user);
        if (! $membership->onboarding_completed) {
            $membership->update([
                'onboarding_completed' => true,
                'onboarding_completed_at' => now(),
            ]);
        }

        return $user;
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

    private function seedDemoArticle(User $author): Article
    {
        $imagePath = '/storage/family-demo/demo-image-1.jpg';

        return Article::query()->updateOrCreate(
            ['slug' => 'family-demo-growth-habits'],
            [
                'title' => '۵ عادت کوچک که مسیر رشد را عوض می‌کند',
                'excerpt' => 'عادت‌های کوچک ولی مداوم، در بلندمدت بزرگ‌ترین تفاوت را می‌سازند — نسخهٔ دمو برای خانواده.',
                'content' => <<<'HTML'
<p>این مقالهٔ دمو برای تست «پست مقاله» در خانواده است.</p>
<ul>
<li>هر روز یک کار کوچک را تمام کن.</li>
<li>پیشرفت را کوچک جشن بگیر.</li>
<li>با خانواده دربارهٔ چالش‌ها صادق باش.</li>
</ul>
HTML,
                'featured_image' => $imagePath,
                'featured_image_mobile' => $imagePath,
                'reading_time' => 4,
                'status' => 'published',
                'published_at' => now()->subDays(2),
                'author_id' => $author->id,
                'is_indexable' => false,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function publishDemoPost(FamilyPostPublisher $publisher, User $author, string $demoKey, array $payload): FamilyPost
    {
        $existing = $this->findDemoPost($demoKey);
        if ($existing) {
            return $existing->load(['blocks.media', 'actions.options']);
        }

        $post = $publisher->createDraft($author, $payload);
        $publisher->publish($author, $post);

        return $post->fresh(['blocks.media', 'actions.options']);
    }

    private function findDemoPost(string $demoKey): ?FamilyPost
    {
        return FamilyDemoPostLookup::find($demoKey);
    }

    /** @return array{text: string, demo_key?: string, type: string, position: int, data?: array<string, string>} */
    private function textBlock(string $text, string $demoKey, int $position = 0): array
    {
        return [
            'type' => FamilyPostBlockType::Text->value,
            'position' => $position,
            'text' => $text,
            'data' => ['demo_key' => $demoKey],
        ];
    }

    private function audioBlock(FamilyMedia $media, int $position): array
    {
        return [
            'type' => FamilyPostBlockType::Audio->value,
            'position' => $position,
            'media_id' => $media->id,
        ];
    }

    private function videoBlock(FamilyMedia $media, int $position): array
    {
        return [
            'type' => FamilyPostBlockType::Video->value,
            'position' => $position,
            'media_id' => $media->id,
        ];
    }

    private function imageBlock(FamilyMedia $media, int $position): array
    {
        return [
            'type' => FamilyPostBlockType::Image->value,
            'position' => $position,
            'media_id' => $media->id,
        ];
    }

    private function articleBlock(Article $article, int $position): array
    {
        return [
            'type' => FamilyPostBlockType::ArticleReference->value,
            'position' => $position,
            'article_id' => $article->id,
        ];
    }

    /**
     * @param  list<User>  $members
     * @return array{approved_comment: FamilyComment}
     */
    private function seedEngagement(FamilyPost $post, array $members, User $author, int $familyId): array
    {
        [$primary, $sara, $amir] = [$members[0], $members[1], $members[2]];
        $stats = app(FamilyStatsService::class);

        $this->seedReactionIfMissing($post, $sara, $familyId, FamilyReactionType::Fire);
        $this->seedReactionIfMissing($post, $amir, $familyId, FamilyReactionType::Heart);
        $this->seedReactionIfMissing($post, $primary, $familyId, FamilyReactionType::Clap);

        $approved = FamilyComment::query()->firstOrCreate(
            [
                'post_id' => $post->id,
                'user_id' => $sara->id,
                'body' => 'سلام داداش بهرام! این فضا واقعاً متفاوته — ممنون که ساختیش. 🔥',
            ],
            [
                'family_id' => $familyId,
                'status' => FamilyCommentStatus::Approved,
                'approved_at' => now()->subHours(3),
                'moderated_by' => $author->id,
                'is_important' => true,
                'family_pulse_at' => now()->subHours(2),
            ],
        );

        FamilyComment::query()->firstOrCreate(
            [
                'post_id' => $post->id,
                'user_id' => $primary->id,
                'body' => 'من هم خیلی هیجان‌زده‌ام — منتظر پست‌های هفته‌ای هستم.',
            ],
            [
                'family_id' => $familyId,
                'status' => FamilyCommentStatus::Approved,
                'approved_at' => now()->subHours(2),
                'moderated_by' => $author->id,
            ],
        );

        FamilyComment::query()->firstOrCreate(
            [
                'post_id' => $post->id,
                'user_id' => $author->id,
                'body' => 'خوش آمدید به همه — هر هفته اینجا با هم جلو می‌ریم.',
            ],
            [
                'family_id' => $familyId,
                'status' => FamilyCommentStatus::Approved,
                'approved_at' => now()->subHour(),
                'moderated_by' => $author->id,
            ],
        );

        FamilyComment::query()->firstOrCreate(
            [
                'post_id' => $post->id,
                'user_id' => $amir->id,
                'body' => 'سؤال: برای شروع تمرکز عمیق از کجا پیشنهاد می‌کنی؟',
            ],
            [
                'family_id' => $familyId,
                'status' => FamilyCommentStatus::Pending,
            ],
        );

        FamilyComment::query()->firstOrCreate(
            [
                'post_id' => $post->id,
                'user_id' => $amir->id,
                'body' => 'این یک کامنت تستی رد‌شده است.',
            ],
            [
                'family_id' => $familyId,
                'status' => FamilyCommentStatus::Rejected,
                'rejection_reason' => FamilyCommentRejectionReason::Irrelevant,
                'rejection_note' => 'دمو: خارج از موضوع پست',
                'rejected_at' => now()->subDay(),
                'moderated_by' => $author->id,
            ],
        );

        $stats->rebuildForPost($post->id);

        return ['approved_comment' => $approved];
    }

    private function seedReactionIfMissing(
        FamilyPost $post,
        User $user,
        int $familyId,
        FamilyReactionType $type,
    ): void {
        $exists = FamilyReaction::query()
            ->where('post_id', $post->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($exists) {
            return;
        }

        FamilyReaction::query()->create([
            'post_id' => $post->id,
            'user_id' => $user->id,
            'family_id' => $familyId,
            'type' => $type->value,
        ]);
    }

    private function seedReplyPost(FamilyPostPublisher $publisher, User $author, FamilyComment $comment): void
    {
        if ($this->findDemoPost('reply-to-member')) {
            return;
        }

        $post = $publisher->createDraft($author, [
            'type' => FamilyPostType::Reply->value,
            'reply_to_comment_id' => $comment->id,
            'audience_mode' => FamilyPostAudienceMode::All->value,
            'blocks' => [
                $this->textBlock(
                    'سارا جان ممنون از انرژی‌ات! ❤️ خوشحالم که اینجایی — هر هفته با هم جلو می‌ریم.',
                    'reply-to-member',
                ),
            ],
        ]);

        $publisher->publish($author, $post);
    }

    /** @param  list<User>  $members */
    private function seedActionResponses(array $members, int $familyId): void
    {
        [$primary, $sara] = [$members[0], $members[1]];
        $stats = app(FamilyStatsService::class);

        $responses = [
            ['demo' => 'action-commitment', 'user' => $primary, 'value' => ['committed' => true]],
            ['demo' => 'action-confirmation', 'user' => $sara, 'value' => ['confirmed' => true]],
            ['demo' => 'action-poll', 'user' => $primary, 'value' => ['option' => 'focus']],
            ['demo' => 'action-scale', 'user' => $sara, 'value' => ['score' => 8]],
            ['demo' => 'action-number', 'user' => $primary, 'value' => ['option' => '45']],
            ['demo' => 'action-short-text', 'user' => $sara, 'value' => ['text' => 'یاد گرفتم کوچک شروع کردن از کمال مهم‌تره.']],
            ['demo' => 'action-multi-choice', 'user' => $primary, 'value' => ['options' => ['sales', 'health']]],
        ];

        foreach ($responses as $row) {
            $post = $this->findDemoPost($row['demo']);
            if (! $post) {
                continue;
            }

            $action = FamilyAction::query()->where('post_id', $post->id)->first();
            if (! $action) {
                continue;
            }

            $exists = FamilyActionResponse::query()
                ->where('action_id', $action->id)
                ->where('user_id', $row['user']->id)
                ->exists();

            if ($exists) {
                continue;
            }

            FamilyActionResponse::query()->create([
                'action_id' => $action->id,
                'user_id' => $row['user']->id,
                'family_id' => $familyId,
                'value' => $row['value'],
            ]);

            $stats->incrementActionResponses($post->id, $familyId);
        }
    }

    private function pinImagePostsToFeedTop(): void
    {
        foreach (['image-moment', 'image-album-journey', 'video-vertical-portrait'] as $index => $demoKey) {
            $post = $this->findDemoPost($demoKey);
            if (! $post) {
                continue;
            }

            $post->update(['published_at' => now()->subMinutes($index * 4)]);
        }
    }

    /** پخش پست‌های دمو در چند روز برای تست جداکنندهٔ تاریخ */
    private function spreadDemoFeedTimeline(): void
    {
        $keys = [
            'welcome-text',
            'weekly-focus',
            'voice-podcast',
            'video-message',
            'image-moment',
            'image-album-journey',
            'article-insight',
            'mixed-weekly-recap',
            'action-commitment',
            'action-confirmation',
            'action-poll',
            'action-scale',
            'action-number',
            'action-short-text',
            'action-multi-choice',
            'reply-to-member',
            'video-vertical-portrait',
        ];

        $total = count($keys);
        foreach ($keys as $index => $demoKey) {
            $post = $this->findDemoPost($demoKey);
            if (! $post) {
                continue;
            }

            if (in_array($demoKey, ['image-moment', 'image-album-journey', 'video-vertical-portrait'], true)) {
                continue;
            }

            $daysAgo = (int) floor(($total - 1 - $index) / max(1, (int) ceil($total / 4)));
            $hour = 8 + (($index * 3) % 14);
            $minute = ($index * 11) % 60;

            $post->update([
                'published_at' => now()->subDays($daysAgo)->setTime($hour, $minute, 0),
            ]);
        }
    }

    /** @param  list<User>  $members */
    private function printSummary(array $members, int $familyId): void
    {
        $published = FamilyPost::query()->where('status', FamilyPostStatus::Published)->count();
        $pinned = FamilyPost::query()->where('is_pinned', true)->count();
        $activeStories = FamilyStory::query()->where('expires_at', '>', now())->count();
        $branding = FamilyBranding::query()->first();

        $this->command?->info('── Family Demo Seed ──');
        $this->command?->info(sprintf('خانواده: #%d | پست‌های منتشرشده: %d', $familyId, $published));
        $this->command?->info(sprintf(
            'برندینگ: %s | سنجاق: %d | استوری فعال: %d',
            $branding?->display_name ?? '—',
            $pinned,
            $activeStories,
        ));
        $this->command?->info(sprintf(
            'عضو اصلی: %s | رمز: %s',
            self::PRIMARY_MEMBER_MOBILE,
            self::PRIMARY_MEMBER_PASSWORD,
        ));
        foreach (self::EXTRA_MEMBERS as $row) {
            $this->command?->info(sprintf('عضو دمو: %s | رمز: %s (%s)', $row['mobile'], $row['password'], $row['name']));
        }
        $this->command?->info('ادمین/اپ Flutter: admin@bahram.local | password | OTP dev: 12345');
        $this->command?->info('تست: http://localhost:3000/family/login');
    }
}
