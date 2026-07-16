<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostBlockType;
use App\Enums\Family\FamilyPostStatus;
use App\Enums\Family\FamilyPostType;
use App\Events\FamilyFeedUpdated;
use App\Models\FamilyAction;
use App\Models\FamilyMedia;
use App\Models\FamilyPost;
use App\Models\FamilyPostBlock;
use App\Models\FamilyPostTarget;
use App\Models\User;
use App\Services\AdminAuditLogger;
use App\Support\SafeBroadcast;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class FamilyPostPublisher
{
    public function __construct(
        private readonly AdminAuditLogger $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function createDraft(User $author, array $payload): FamilyPost
    {
        return DB::transaction(function () use ($author, $payload) {
            $post = FamilyPost::query()->create([
                'author_id' => $author->id,
                'type' => $payload['type'] ?? FamilyPostType::Text->value,
                'status' => FamilyPostStatus::Draft,
                'audience_mode' => $payload['audience_mode'] ?? FamilyPostAudienceMode::All->value,
                'is_important' => (bool) ($payload['is_important'] ?? false),
                'reply_to_comment_id' => $payload['reply_to_comment_id'] ?? null,
            ]);

            $this->syncBlocks($post, $payload['blocks'] ?? []);
            $this->syncTargets($post, $payload['family_ids'] ?? []);
            $this->syncAction($post, $payload['action'] ?? null);

            $this->audit->log($author, 'family.post_created', $post, [
                'type' => $post->type?->value,
            ]);

            return $post->fresh(['blocks.media', 'targets', 'actions.options']);
        });
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function updateDraft(User $actor, FamilyPost $post, array $payload): FamilyPost
    {
        return DB::transaction(function () use ($actor, $post, $payload) {
            $post->update(array_filter([
                'audience_mode' => $payload['audience_mode'] ?? null,
                'is_important' => array_key_exists('is_important', $payload) ? (bool) $payload['is_important'] : null,
            ], fn ($v) => $v !== null));

            if (array_key_exists('blocks', $payload)) {
                $this->syncBlocks($post, $payload['blocks'] ?? []);
            }

            if (array_key_exists('family_ids', $payload)) {
                $this->syncTargets($post, $payload['family_ids'] ?? []);
            }

            if (array_key_exists('action', $payload) && $payload['action']) {
                $post->actions()->delete();
                $this->syncAction($post, $payload['action']);
            }

            $this->audit->log($actor, 'family.post_updated', $post);

            return $post->fresh(['blocks.media', 'targets', 'actions.options']);
        });
    }

    public function publish(User $actor, FamilyPost $post): FamilyPost
    {
        $post->load('blocks.media');

        foreach ($post->blocks as $block) {
            if ($block->media_id && $block->media) {
                if ($block->media->status !== FamilyMediaStatus::Ready) {
                    throw new InvalidArgumentException('تمام رسانه‌ها باید آماده (READY) باشند.');
                }
            }
        }

        $post->update([
            'status' => FamilyPostStatus::Published,
            'published_at' => $post->published_at ?? now(),
        ]);

        $this->audit->log($actor, 'family.post_published', $post);

        $fresh = $post->fresh(['blocks.media', 'targets', 'actions.options']);

        if ($fresh) {
            SafeBroadcast::optionally(
                fn () => broadcast(new FamilyFeedUpdated($fresh)),
            );
        }

        return $fresh ?? $post;
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     */
    private function syncBlocks(FamilyPost $post, array $blocks): void
    {
        FamilyPostBlock::query()->where('post_id', $post->id)->delete();

        foreach (array_values($blocks) as $i => $block) {
            FamilyPostBlock::query()->create([
                'post_id' => $post->id,
                'type' => $block['type'] ?? FamilyPostBlockType::Text->value,
                'position' => $block['position'] ?? $i,
                'text_content' => $block['text'] ?? $block['text_content'] ?? null,
                'media_id' => $block['media_id'] ?? null,
                'article_id' => $block['article_id'] ?? null,
                'comment_id' => $block['comment_id'] ?? null,
                'action_id' => $block['action_id'] ?? null,
                'data' => $block['data'] ?? null,
            ]);
        }
    }

    /** @param  list<int>  $familyIds */
    private function syncTargets(FamilyPost $post, array $familyIds): void
    {
        FamilyPostTarget::query()->where('post_id', $post->id)->delete();

        foreach (array_unique($familyIds) as $familyId) {
            FamilyPostTarget::query()->create([
                'post_id' => $post->id,
                'family_id' => (int) $familyId,
            ]);
        }
    }

    /** @param  array<string, mixed>|null  $action */
    private function syncAction(FamilyPost $post, ?array $action): void
    {
        if (! $action) {
            return;
        }

        $created = FamilyAction::query()->create([
            'post_id' => $post->id,
            'type' => $action['type'],
            'prompt' => $action['prompt'] ?? '',
            'config' => $action['config'] ?? null,
            'follow_up_after_minutes' => $action['follow_up_after_minutes'] ?? null,
            'follow_up_message' => $action['follow_up_message'] ?? null,
        ]);

        foreach (array_values($action['options'] ?? []) as $i => $opt) {
            $created->options()->create([
                'label' => $opt['label'],
                'value' => $opt['value'] ?? $opt['label'],
                'position' => $opt['position'] ?? $i,
            ]);
        }

        FamilyPostBlock::query()->create([
            'post_id' => $post->id,
            'type' => FamilyPostBlockType::ActionReference,
            'position' => 999,
            'action_id' => $created->id,
        ]);
    }
}
