<?php

namespace App\Console\Commands;

use App\Models\Article;
use App\Support\ArticleSlug;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class NormalizeArticleSlugs extends Command
{
    protected $signature = 'articles:normalize-slugs {--dry-run : Show changes without saving}';

    protected $description = 'Convert non-ASCII article slugs to URL-safe ASCII slugs';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $updated = 0;

        Article::query()
            ->orderBy('id')
            ->each(function (Article $article) use ($dryRun, &$updated) {
                $target = ArticleSlug::normalize($article->slug, $article->title);
                if ($target === $article->slug) {
                    return;
                }

                $unique = $this->uniqueSlug($target, $article->id);
                $this->line("{$article->id}: {$article->slug} -> {$unique}");
                $updated++;

                if ($dryRun) {
                    return;
                }

                $article->slug = $unique;
                $article->saveQuietly();
            });

        $this->info($dryRun ? "Would update {$updated} article(s)." : "Updated {$updated} article(s).");

        return self::SUCCESS;
    }

    private function uniqueSlug(string $base, int $ignoreId): string
    {
        $slug = $base;
        $suffix = 2;

        while (
            Article::query()
                ->where('slug', $slug)
                ->where('id', '!=', $ignoreId)
                ->exists()
        ) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
