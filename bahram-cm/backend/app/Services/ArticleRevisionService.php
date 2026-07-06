<?php

namespace App\Services;

use App\Models\Article;
use App\Models\ArticleRevision;
use App\Models\User;
use Illuminate\Support\Collection;

class ArticleRevisionService
{
    /** @param  array<string, mixed>  $snapshot */
    public function hashSnapshot(array $snapshot): string
    {
        return hash('sha256', json_encode($this->normalizeValue($snapshot), JSON_UNESCAPED_UNICODE));
    }

    public function listForArticle(Article $article): Collection
    {
        return $article->revisions()
            ->with('author:id,name')
            ->orderByDesc('revision_number')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $snapshot
     * @return array{revision: ?ArticleRevision, skipped: bool, message: ?string}
     */
    public function create(
        Article $article,
        array $snapshot,
        string $label,
        bool $force = false,
        ?User $author = null,
    ): array {
        if ($article->status !== 'draft') {
            return [
                'revision' => null,
                'skipped' => true,
                'message' => 'نسخه‌بندی فقط برای پیش‌نویس فعال است.',
            ];
        }

        $hash = $this->hashSnapshot($snapshot);

        if (! $force) {
            $latest = $article->revisions()->orderByDesc('revision_number')->first();
            if ($latest && $latest->content_hash === $hash) {
                return [
                    'revision' => null,
                    'skipped' => true,
                    'message' => 'محتوا نسبت به آخرین نسخه تغییر نکرده است.',
                ];
            }
        }

        $nextNumber = ((int) $article->revisions()->max('revision_number')) + 1;

        $revision = $article->revisions()->create([
            'revision_number' => $nextNumber,
            'label' => $label,
            'snapshot' => $snapshot,
            'content_hash' => $hash,
            'is_manual' => $force,
            'author_id' => $author?->id,
        ]);

        if (! $force) {
            $this->pruneAutosaves($article);
        }

        return [
            'revision' => $revision->fresh('author:id,name'),
            'skipped' => false,
            'message' => null,
        ];
    }

    public function purgeForArticle(Article $article): void
    {
        $article->revisions()->delete();
    }

    private function pruneAutosaves(Article $article): void
    {
        $autosaves = $article->revisions()
            ->where('is_manual', false)
            ->orderByDesc('revision_number')
            ->get(['id', 'revision_number']);

        if ($autosaves->count() <= ArticleRevision::MAX_AUTOSAVES) {
            return;
        }

        $toDelete = $autosaves
            ->slice(ArticleRevision::MAX_AUTOSAVES)
            ->pluck('id');

        ArticleRevision::query()->whereIn('id', $toDelete)->delete();
    }

    /** @return mixed */
    private function normalizeValue(mixed $value): mixed
    {
        if (is_array($value)) {
            if ($this->isListArray($value)) {
                return array_map(fn ($item) => $this->normalizeValue($item), $value);
            }

            ksort($value);
            $normalized = [];
            foreach ($value as $key => $item) {
                $normalized[$key] = $this->normalizeValue($item);
            }

            return $normalized;
        }

        return $value;
    }

    /** @param  array<int|string, mixed>  $value */
    private function isListArray(array $value): bool
    {
        if ($value === []) {
            return true;
        }

        return array_keys($value) === range(0, count($value) - 1);
    }
}
