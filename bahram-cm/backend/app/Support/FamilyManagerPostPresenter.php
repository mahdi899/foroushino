<?php

namespace App\Support;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Models\FamilyMedia;
use App\Models\FamilyPost;
use Illuminate\Support\Collection;

/** Shapes Family Manager post JSON for admin clients (includes safe media URLs). */
final class FamilyManagerPostPresenter
{
    /** @return array<string, mixed> */
    public static function present(FamilyPost $post): array
    {
        $post->loadMissing(['author:id,name', 'blocks.media', 'blocks.article', 'targets.family:id,internal_name', 'actions.options', 'stats']);

        return [
            'id' => $post->id,
            'type' => $post->type?->value ?? $post->type,
            'status' => $post->status?->value ?? $post->status,
            'audience_mode' => $post->audience_mode?->value ?? $post->audience_mode,
            'audience_summary' => self::audienceSummary($post),
            'is_important' => (bool) $post->is_important,
            'is_pinned' => (bool) $post->is_pinned,
            'pinned_at' => $post->pinned_at?->toIso8601String(),
            'published_at' => $post->published_at?->toIso8601String(),
            'created_at' => $post->created_at?->toIso8601String(),
            'author' => [
                'name' => $post->author?->name ?? 'بهرام',
            ],
            'blocks' => $post->blocks->map(fn ($block) => [
                'id' => $block->id,
                'type' => $block->type?->value ?? $block->type,
                'position' => (int) $block->position,
                'text_content' => $block->text_content,
                'media_id' => $block->media_id,
                'article_id' => $block->article_id,
                'comment_id' => $block->comment_id,
                'action_id' => $block->action_id,
                'media' => self::presentMedia($block->media),
            ])->values()->all(),
            'actions' => $post->actions->map(fn ($action) => [
                'id' => $action->id,
                'type' => $action->type?->value ?? $action->type,
                'prompt' => $action->prompt,
                'options' => $action->options->map(fn ($opt) => [
                    'label' => $opt->label,
                    'value' => $opt->value,
                    'position' => (int) $opt->position,
                ])->values()->all(),
            ])->values()->all(),
            'targets' => $post->targets->map(fn ($target) => [
                'id' => $target->id,
                'post_id' => $target->post_id,
                'family_id' => $target->family_id,
                'family_name' => $target->family?->internal_name,
            ])->values()->all(),
            'stats' => [
                'views' => self::postViewCount($post),
            ],
        ];
    }

    private static function audienceSummary(FamilyPost $post): string
    {
        $mode = $post->audience_mode;
        $names = $post->targets
            ->map(fn ($target) => $target->family?->internal_name)
            ->filter()
            ->values()
            ->all();

        if ($mode === FamilyPostAudienceMode::All) {
            return 'همه خانواده‌ها';
        }

        $joined = $names !== [] ? implode('، ', $names) : 'خانواده‌های انتخابی';

        return match ($mode) {
            FamilyPostAudienceMode::Include => $joined,
            FamilyPostAudienceMode::Exclude => 'همه به‌جز '.$joined,
            default => 'همه خانواده‌ها',
        };
    }

    private static function postViewCount(FamilyPost $post): int
    {
        if ($post->relationLoaded('stats')) {
            $stats = $post->getRelation('stats');

            if ($stats === null) {
                return 0;
            }

            if ($stats instanceof Collection) {
                return (int) $stats->sum('views_count');
            }

            return 0;
        }

        return (int) $post->stats()->sum('views_count');
    }

    /** @return array<string, mixed>|null */
    public static function presentMedia(?FamilyMedia $media): ?array
    {
        if (! $media) {
            return null;
        }

        return [
            'id' => $media->id,
            'type' => $media->type?->value ?? $media->type,
            'status' => $media->status?->value ?? $media->status,
            'original_filename' => $media->original_filename,
            'mime_type' => $media->mime_type,
            'size' => $media->size,
            'duration' => $media->duration,
            'width' => $media->width,
            'height' => $media->height,
            'waveform' => $media->waveform,
            'failure_reason' => $media->failure_reason,
            'cdn_url' => $media->cdnUrl(),
        ];
    }
}
