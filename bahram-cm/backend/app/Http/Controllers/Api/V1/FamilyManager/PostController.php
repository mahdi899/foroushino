<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostBlockType;
use App\Enums\Family\FamilyPostStatus;
use App\Enums\Family\FamilyPostType;
use App\Events\FamilyFeedUpdated;
use App\Http\Controllers\Controller;
use App\Models\FamilyComment;
use App\Models\FamilyPost;
use App\Services\AdminAuditLogger;
use App\Services\Family\FamilyIntelligenceService;
use App\Services\Family\FamilyNotificationService;
use App\Services\Family\FamilyPostPublisher;
use App\Services\Family\FeedService;
use App\Services\Family\PostAudienceResolver;
use App\Support\ApiResponse;
use App\Support\Csv;
use App\Support\FamilyManagerActionResultsPresenter;
use App\Support\FamilyManagerPostPresenter;
use App\Support\SafeBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PostController extends Controller
{
    public function __construct(
        private readonly FamilyPostPublisher $publisher,
        private readonly AdminAuditLogger $audit,
        private readonly FamilyNotificationService $notifications,
        private readonly FamilyManagerActionResultsPresenter $actionResults,
        private readonly PostAudienceResolver $audience,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(FamilyPostStatus::class)],
            'family_id' => ['nullable', 'integer', 'exists:families,id'],
        ]);

        $query = FamilyPost::query()
            ->with(['author:id,name', 'blocks.media', 'targets.family:id,internal_name', 'actions.options', 'stats'])
            ->orderByDesc('id');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($familyId = $request->query('family_id')) {
            $this->audience->scopeVisibleToFamily($query, (int) $familyId);
        }

        $posts = $query->paginate(min(50, (int) $request->query('per_page', 20)));

        return ApiResponse::success(
            collect($posts->items())->map(fn (FamilyPost $post) => FamilyManagerPostPresenter::present($post))->all(),
            200,
            [
            'current_page' => $posts->currentPage(),
            'last_page' => $posts->lastPage(),
            'total' => $posts->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->postRules());

        $post = $this->publisher->createDraft($request->user(), $data);

        return ApiResponse::success(FamilyManagerPostPresenter::present($post), 201);
    }

    /**
     * Shared store/update rules. Every block sub-field needs an explicit rule —
     * Laravel's validate() only keeps keys with a matching (wildcard) rule, so
     * omitting e.g. `blocks.*.media_id` silently drops it before it reaches the
     * publisher, which then can't find the media to enforce READY status on.
     *
     * @return array<string, array<int, mixed>>
     */
    private function postRules(bool $requireType = true): array
    {
        return [
            'type' => [$requireType ? 'required' : 'nullable', Rule::enum(FamilyPostType::class)],
            'audience_mode' => ['nullable', Rule::enum(FamilyPostAudienceMode::class)],
            'is_important' => ['nullable', 'boolean'],
            'comments_enabled' => ['nullable', 'boolean'],
            'family_ids' => ['nullable', 'array'],
            'family_ids.*' => ['integer', 'exists:families,id'],
            'blocks' => ['nullable', 'array'],
            'blocks.*.type' => ['required', Rule::enum(FamilyPostBlockType::class)],
            'blocks.*.position' => ['nullable', 'integer'],
            'blocks.*.text' => ['nullable', 'string'],
            'blocks.*.media_id' => ['nullable', 'integer', 'exists:family_media,id'],
            'blocks.*.article_id' => ['nullable', 'integer', 'exists:articles,id'],
            'blocks.*.comment_id' => ['nullable', 'integer', 'exists:family_comments,id'],
            'blocks.*.action_id' => ['nullable', 'integer', 'exists:family_actions,id'],
            'blocks.*.data' => ['nullable', 'array'],
            'action' => ['nullable', 'array'],
            'action.type' => ['required_with:action', 'string'],
            'action.prompt' => ['nullable', 'string'],
            'action.config' => ['nullable', 'array'],
            'action.follow_up_after_minutes' => ['nullable', 'integer', 'min:1'],
            'action.follow_up_message' => ['nullable', 'string'],
            'action.options' => ['nullable', 'array'],
            'action.options.*.label' => ['required_with:action.options', 'string'],
            'action.options.*.value' => ['nullable', 'string'],
            'action.options.*.position' => ['nullable', 'integer'],
            'action.active_until' => ['nullable', 'date'],
            'action.is_active' => ['nullable', 'boolean'],
        ];
    }

    public function show(FamilyPost $post): JsonResponse
    {
        $post->load(['author:id,name', 'blocks.media', 'blocks.article', 'targets', 'actions.options']);

        return ApiResponse::success(FamilyManagerPostPresenter::present($post));
    }

    public function actionResults(FamilyPost $post): JsonResponse
    {
        return ApiResponse::success($this->actionResults->forPost($post));
    }

    public function exportActionResults(FamilyPost $post): StreamedResponse
    {
        $results = $this->actionResults->forPost($post);
        $rows = [];

        foreach ($results as $action) {
            foreach ($action['responses'] as $response) {
                $rows[] = [
                    $post->id,
                    $action['prompt'] ?? '',
                    $action['type'] ?? '',
                    $response['name'] ?? '',
                    $response['mobile'] ?? '',
                    $response['family_name'] ?? '',
                    $response['value_label'] ?? '',
                    $response['responded_at'] ?? '',
                ];
            }
        }

        return Csv::download(
            "family-post-{$post->id}-action-results.csv",
            ['post_id', 'action_prompt', 'action_type', 'name', 'mobile', 'family', 'response', 'responded_at'],
            $rows,
        );
    }

    public function aiDraft(Request $request, FamilyIntelligenceService $intelligence): JsonResponse
    {
        $data = $request->validate([
            'topic' => ['required', 'string', 'max:500'],
            'type' => ['nullable', 'string', 'max:40'],
            'tone' => ['nullable', 'string', 'max:200'],
        ]);

        return ApiResponse::success($intelligence->generatePostDraft(
            $data['topic'],
            $data['type'] ?? 'text',
            $data['tone'] ?? null,
        ));
    }

    public function update(Request $request, FamilyPost $post): JsonResponse
    {
        $data = $request->validate($this->postRules(requireType: false));

        $updated = $this->publisher->updateDraft($request->user(), $post, $data);

        return ApiResponse::success(FamilyManagerPostPresenter::present($updated));
    }

    public function publish(Request $request, FamilyPost $post): JsonResponse
    {
        try {
            $published = $this->publisher->publish($request->user(), $post);
        } catch (InvalidArgumentException $e) {
            return ApiResponse::error('media_not_ready', $e->getMessage(), 422);
        }

        if ($published->is_important) {
            // Important-post broadcast handled asynchronously in production via a queued job
            // fan-out over home-family members; kept out of the request cycle intentionally.
        }

        return ApiResponse::success(FamilyManagerPostPresenter::present($published));
    }

    public function archive(Request $request, FamilyPost $post): JsonResponse
    {
        $post->update([
            'status' => FamilyPostStatus::Archived,
            'archived_at' => now(),
        ]);

        $this->audit->log($request->user(), 'family.post_archived', $post);
        FeedService::invalidateFeedTipCache();
        SafeBroadcast::optionally(
            fn () => broadcast(new FamilyFeedUpdated($post, 'archived')),
        );

        return ApiResponse::success(FamilyManagerPostPresenter::present($post));
    }

    public function recover(Request $request, FamilyPost $post): JsonResponse
    {
        abort_unless($post->status === FamilyPostStatus::Archived, 422, 'فقط پست آرشیوشده قابل بازیابی است.');

        $restoreStatus = $post->published_at !== null
            ? FamilyPostStatus::Published
            : FamilyPostStatus::Draft;

        $post->update([
            'status' => $restoreStatus,
            'archived_at' => null,
        ]);

        $this->audit->log($request->user(), 'family.post_recovered', $post);
        FeedService::invalidateFeedTipCache();

        $fresh = $post->fresh() ?? $post;

        if ($restoreStatus === FamilyPostStatus::Published) {
            SafeBroadcast::optionally(
                fn () => broadcast(new FamilyFeedUpdated($fresh, 'published')),
            );
        }

        return ApiResponse::success(FamilyManagerPostPresenter::present($fresh));
    }

    public function destroy(Request $request, FamilyPost $post): JsonResponse
    {
        $wasPublished = $post->status === FamilyPostStatus::Published
            || ($post->status === FamilyPostStatus::Archived && $post->published_at !== null);

        $this->audit->log($request->user(), 'family.post_deleted', $post);

        if ($wasPublished) {
            FeedService::invalidateFeedTipCache();
            SafeBroadcast::optionally(
                fn () => broadcast(new FamilyFeedUpdated($post, 'deleted')),
            );
        }

        $post->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    public function pin(Request $request, FamilyPost $post): JsonResponse
    {
        abort_unless($post->status === FamilyPostStatus::Published, 422, 'فقط پست منتشرشده قابل سنجاق است.');

        $post->update([
            'is_pinned' => true,
            'pinned_at' => now(),
        ]);

        $this->audit->log($request->user(), 'family.post_pinned', $post);
        $fresh = $post->fresh() ?? $post;
        SafeBroadcast::optionally(
            fn () => broadcast(new FamilyFeedUpdated($fresh, 'pinned')),
        );

        return ApiResponse::success(FamilyManagerPostPresenter::present($fresh));
    }

    public function unpin(Request $request, FamilyPost $post): JsonResponse
    {
        $post->update([
            'is_pinned' => false,
            'pinned_at' => null,
        ]);

        $this->audit->log($request->user(), 'family.post_unpinned', $post);
        $fresh = $post->fresh() ?? $post;
        SafeBroadcast::optionally(
            fn () => broadcast(new FamilyFeedUpdated($fresh, 'unpinned')),
        );

        return ApiResponse::success(FamilyManagerPostPresenter::present($fresh));
    }

    public function reply(Request $request, FamilyComment $comment): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:text,voice'],
            'text' => ['required_if:type,text', 'nullable', 'string', 'max:2000'],
            'media_id' => ['required_if:type,voice', 'nullable', 'integer', 'exists:family_media,id'],
        ]);

        // Reply context is rendered from the post's reply_to_comment_id relation
        // (see FamilyPostResource::reply_context) — no separate block needed.
        $blocks = $data['type'] === 'text'
            ? [['type' => 'text', 'position' => 0, 'text' => $data['text']]]
            : [['type' => 'audio', 'position' => 0, 'media_id' => $data['media_id']]];

        $post = $this->publisher->createDraft($request->user(), [
            'type' => FamilyPostType::Reply->value,
            'audience_mode' => FamilyPostAudienceMode::Include->value,
            'family_ids' => [$comment->family_id],
            'blocks' => $blocks,
            'reply_to_comment_id' => $comment->id,
        ]);

        $published = $this->publisher->publish($request->user(), $post);

        $this->audit->log($request->user(), 'family.bahram_replied', $comment, ['post_id' => $published->id]);

        if ($comment->user) {
            $this->notifications->bahramReplied($comment->user);
        }

        return ApiResponse::success(FamilyManagerPostPresenter::present($published), 201);
    }
}
