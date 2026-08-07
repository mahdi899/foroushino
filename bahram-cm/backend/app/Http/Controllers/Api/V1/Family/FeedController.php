<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Actions\Family\JoinFamily;
use App\Http\Controllers\Controller;
use App\Http\Requests\Family\UpdateFamilyDisplayNameRequest;
use App\Http\Resources\V1\Family\FamilyPostResource;
use App\Modules\TelegramBot\Services\DisplayNameValidator;
use App\Services\AdminTelegramLogService;
use App\Support\StudentDisplayName;
use App\Models\FamilyPost;
use App\Services\Family\EntryContext;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyBrandingService;
use App\Services\Family\FamilyMemberCountService;
use App\Services\Family\FamilyStoryService;
use App\Services\Family\FeedService;
use App\Services\Family\PostAudienceResolver;
use App\Support\ApiResponse;
use App\Support\HttpCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FeedController extends Controller
{
    public function __construct(
        private readonly FeedService $feed,
        private readonly FamilyAccessService $access,
        private readonly PostAudienceResolver $audience,
        private readonly FamilyBrandingService $branding,
        private readonly FamilyStoryService $stories,
        private readonly FamilyMemberCountService $memberCounts,
    ) {}

    public function index(Request $request): JsonResponse|Response
    {
        // Not behind `auth:sanctum` middleware (guests must reach this route too),
        // so the default guard won't see the bearer token — resolve explicitly.
        $user = $request->user('sanctum');
        $membership = $user ? $this->access->homeMembership($user) : null;

        if (! $membership) {
            $preview = $this->feed->guestPreview();
            $branding = $this->branding->publicPayload();
            $memberCount = $this->memberCounts->total();
            $revision = FeedService::feedRevision();
            $limit = (int) config('family.feed.guest_preview_posts', 6);
            $tipId = (int) ($preview['data']->first()?->id ?? 0);
            $etag = HttpCache::etag('guest-feed', $revision, $limit, $tipId);
            $cacheControl = HttpCache::publicMaxAge(
                (int) config('family.cache.guest_feed_ttl', 30),
            );

            if (HttpCache::matches($request, $etag)) {
                return response('', 304)
                    ->header('ETag', $etag)
                    ->header('Cache-Control', $cacheControl);
            }

            return ApiResponse::success(
                FamilyPostResource::collection($preview['data'])->resolve(),
                200,
                [
                    'next_cursor' => null,
                    'guest' => true,
                    'needs_auth' => ! $user,
                    'needs_join' => (bool) $user,
                    'display_name' => $branding['display_name'],
                    'branding' => $branding,
                    'has_active_stories' => $this->stories->hasActiveStories(),
                    'member_count' => $memberCount > 0 ? $memberCount : null,
                    'feed_revision' => $revision,
                ],
            )
                ->header('ETag', $etag)
                ->header('Cache-Control', $cacheControl);
        }

        $limit = $request->integer('limit');
        $limit = $limit > 0 ? min($limit, 50) : null;
        $direction = $request->query('direction') === 'newer' ? 'newer' : 'older';

        $result = $this->feed->forMember(
            $user,
            $request->query('cursor'),
            $limit,
            $membership,
            $direction,
        );

        $family = $result['membership']->family;
        $branding = $this->branding->publicPayload();
        $revision = FeedService::feedRevision();
        $inactive = $family?->isInactive() ?? false;
        $cursor = (string) $request->query('cursor', '');
        $resolvedLimit = $limit ?? (int) config('family.feed.per_page', 4);
        $tipId = (int) ($result['data']->first()?->id ?? 0);
        $etag = HttpCache::etag(
            'member-feed',
            (int) $family->id,
            $revision,
            $direction,
            $cursor,
            $resolvedLimit,
            $tipId,
            (int) $user->id,
            $inactive ? 'inactive' : 'active',
        );
        $cacheControl = HttpCache::privateMaxAge(0);

        if (HttpCache::matches($request, $etag)) {
            return response('', 304)
                ->header('ETag', $etag)
                ->header('Cache-Control', $cacheControl)
                ->header('Vary', 'Authorization');
        }

        return ApiResponse::success(
            FamilyPostResource::collection($result['data'])->resolve(),
            200,
            [
                'next_cursor' => $result['next_cursor'],
                'prev_cursor' => $result['prev_cursor'] ?? null,
                'has_newer' => $result['has_newer'] ?? false,
                'guest' => false,
                'display_name' => $branding['display_name'],
                'branding' => $branding,
                'has_active_stories' => $inactive ? false : $this->stories->hasActiveStories((int) $family->id),
                'member_count' => (int) $family->member_count,
                'onboarding_completed' => (bool) $result['membership']->onboarding_completed,
                'needs_name' => StudentDisplayName::needsDisplayName($user),
                'is_staff' => $this->access->canManage($user),
                'feed_revision' => $revision,
                'family_inactive' => $inactive,
                'inactive_message' => $inactive ? 'خانواده غیرفعال شده است' : null,
            ],
        )
            ->header('ETag', $etag)
            ->header('Cache-Control', $cacheControl)
            ->header('Vary', 'Authorization');
    }

    public function unreadSummary(Request $request): JsonResponse|Response
    {
        $afterId = max(0, $request->integer('after_id'));
        $user = $request->user('sanctum');
        $membership = $user ? $this->access->homeMembership($user) : null;
        $familyId = $membership ? (int) $membership->family_id : 0;

        $payload = $this->feed->unreadSummary($afterId, $user);
        $etag = HttpCache::etag(
            'unread',
            $familyId,
            $afterId,
            $payload['feed_revision'] ?? FeedService::feedRevision(),
            $payload['latest_post_id'],
            $payload['unread_count'],
        );

        return HttpCache::conditionalJson(
            $request,
            $payload,
            $etag,
            HttpCache::privateMaxAge((int) config('family.cache.unread_ttl', 45)),
        )->header('Vary', 'Authorization');
    }

    public function pinned(Request $request): JsonResponse|Response
    {
        $user = $request->user();
        $membership = $this->access->requireMembership($user);
        $familyId = (int) $membership->family_id;
        $posts = $this->feed->pinnedForMember($user, $membership);
        $revision = FeedService::feedRevision();
        $etag = HttpCache::etag('pinned', $familyId, $revision, (int) $user->id, $posts->count());

        if (HttpCache::matches($request, $etag)) {
            return response('', 304)
                ->header('ETag', $etag)
                ->header('Cache-Control', HttpCache::privateMaxAge((int) config('family.cache.pinned_ttl', 60)))
                ->header('Vary', 'Authorization');
        }

        return ApiResponse::success(
            FamilyPostResource::collection($posts)->resolve(),
        )
            ->header('ETag', $etag)
            ->header('Cache-Control', HttpCache::privateMaxAge((int) config('family.cache.pinned_ttl', 60)))
            ->header('Vary', 'Authorization');
    }

    public function show(Request $request, FamilyPost $post): JsonResponse
    {
        $user = $request->user('sanctum');
        abort_unless($post->status?->value === 'published' || $post->status === 'published', 404);

        if ($user) {
            $membership = $this->access->requireMembership($user);
            $membership->loadMissing('family');
            abort_if($membership->family?->isInactive(), 404);
            abort_unless($this->audience->visibleToFamily($post, (int) $membership->family_id), 404);

            $post->load([
                'author:id,name',
                'blocks.media',
                'blocks.article:id,title,slug,excerpt,featured_image',
                'actions.options',
                'replyToComment.user:id,name',
                'stats' => fn ($q) => $q->where('family_id', $membership->family_id),
            ]);
        } else {
            abort_unless(($post->audience_mode?->value ?? $post->audience_mode) === 'all', 404);
            $post->load(['author:id,name', 'blocks.media', 'blocks.article:id,title,slug,excerpt,featured_image']);
        }

        return ApiResponse::success((new FamilyPostResource($post))->resolve());
    }

    /**
     * Chronological window centered on `$post` — lets "jump to message" (e.g. an old
     * pinned post) work in one request regardless of how far back it is.
     */
    public function jump(Request $request, FamilyPost $post): JsonResponse
    {
        $user = $request->user('sanctum');
        abort_unless($user, 401);
        abort_unless($post->status?->value === 'published' || $post->status === 'published', 404);
        abort_unless($post->published_at, 404);

        $membership = $this->access->requireMembership($user);
        abort_unless($this->audience->visibleToFamily($post, (int) $membership->family_id), 404);
        $membership->loadMissing('family');
        abort_if($membership->family?->isInactive(), 404);

        $limit = $request->integer('limit');
        $half = $limit > 0 ? min(intdiv($limit, 2), 25) : 12;

        $result = $this->feed->jumpToPost($user, $post, $membership, $half, $half);

        return ApiResponse::success(
            FamilyPostResource::collection($result['data'])->resolve(),
            200,
            [
                'next_cursor' => $result['next_cursor'],
                'prev_cursor' => $result['prev_cursor'],
                'has_newer' => $result['has_newer'],
                'has_older' => $result['has_older'],
                'target_post_id' => $post->id,
            ]
        );
    }

    public function join(Request $request, JoinFamily $join): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $context = EntryContext::fromArray($request->only([
            'source', 'campaign', 'content', 'referrer',
            'entry_event', 'entry_event_id', 'entry_event_ref', 'reel',
            'family_id', 'family',
        ]));

        $membership = $join($user, $context);

        return ApiResponse::success([
            'joined' => true,
            'onboarding_completed' => (bool) $membership->onboarding_completed,
            'needs_name' => StudentDisplayName::needsDisplayName($user),
            'member_count' => (int) $membership->family->member_count,
            'display_name' => $this->branding->publicPayload()['display_name'],
        ]);
    }

    public function updateDisplayName(UpdateFamilyDisplayNameRequest $request): JsonResponse
    {
        $user = $request->user();
        $this->access->requireMembership($user);

        if (! StudentDisplayName::needsDisplayName($user)) {
            return ApiResponse::success([
                'needs_name' => false,
                'display_name' => StudentDisplayName::fromUser($user),
            ]);
        }

        $validator = new DisplayNameValidator;
        $firstName = $validator->sanitize($request->string('first_name')->toString());
        $lastName = $validator->sanitize($request->string('last_name')->toString());

        if (! $firstName || ! $lastName) {
            return ApiResponse::error('invalid_name', 'نام یا نام خانوادگی معتبر نیست.', 422);
        }

        $fullName = trim($firstName.' '.$lastName);

        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            ['first_name' => $firstName, 'last_name' => $lastName],
        );
        $user->update(['name' => $fullName]);
        $user->refresh()->loadMissing('profile');

        app(AdminTelegramLogService::class)->notifyProfileUpdated($user);

        return ApiResponse::success([
            'needs_name' => false,
            'display_name' => $fullName,
        ]);
    }

    public function completeOnboarding(Request $request): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());

        if (! $membership->onboarding_completed) {
            $membership->update([
                'onboarding_completed' => true,
                'onboarding_completed_at' => now(),
            ]);
        }

        return ApiResponse::success([
            'onboarding_completed' => true,
            'title' => str_replace('{name}', $request->user()->name ?? 'دوست', config('family.onboarding.title')),
            'body' => config('family.onboarding.body'),
            'cta' => config('family.onboarding.cta'),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $membership = $this->access->homeMembership($request->user());

        if (! $membership) {
            $branding = $this->branding->publicPayload();

            return ApiResponse::success([
                'is_member' => false,
                'display_name' => $branding['display_name'],
                'branding' => $branding,
                'has_active_stories' => $this->stories->hasActiveStories(),
            ]);
        }

        $branding = $this->branding->publicPayload();
        $inactive = $membership->family?->isInactive() ?? false;

        return ApiResponse::success([
            'is_member' => true,
            'display_name' => $branding['display_name'],
            'branding' => $branding,
            'has_active_stories' => $inactive ? false : $this->stories->hasActiveStories((int) $membership->family_id),
            'member_count' => (int) $membership->family->member_count,
            'onboarding_completed' => (bool) $membership->onboarding_completed,
            'needs_name' => StudentDisplayName::needsDisplayName($request->user()),
            'joined_at' => $membership->joined_at?->toIso8601String(),
            'is_staff' => $this->access->canManage($request->user()),
            'family_inactive' => $inactive,
            'inactive_message' => $inactive ? 'خانواده غیرفعال شده است' : null,
            'family_id' => (int) $membership->family_id,
        ]);
    }
}
