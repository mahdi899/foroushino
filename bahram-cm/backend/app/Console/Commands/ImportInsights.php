<?php

namespace App\Console\Commands;

use App\Models\Article;
use App\Support\LegacyMediaMap;
use App\Support\MediaUrl;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Yaml\Yaml;

class ImportInsights extends Command
{
    protected $signature = 'content:import-insights {--force : Overwrite existing articles by slug}';

    protected $description = 'Import frontend/content/insights MDX files into the articles table';

    /** @var list<string> */
    private array $coverLegacyPaths = [
        '/media/site-photos/story-step-01.jpg',
        '/media/site-photos/story-step-02.jpg',
        '/media/site-photos/story-step-03.jpg',
        '/media/site-photos/story-step-04.jpg',
        '/media/site-photos/manifesto-landscape.jpg',
        '/media/site-photos/manifesto-portrait-a.jpg',
        '/media/site-photos/manifesto-portrait-b.jpg',
        '/media/site-photos/course-backstage.jpg',
        '/media/site-photos/square-backstage.jpg',
        '/media/site-photos/landscape-session.jpg',
    ];

    public function handle(): int
    {
        $dir = dirname(base_path()).'/frontend/content/insights';
        if (! is_dir($dir)) {
            $this->error('insights directory not found');

            return self::FAILURE;
        }

        $imported = 0;
        $files = collect(File::files($dir))->filter(fn ($f) => str_ends_with($f->getFilename(), '.mdx'));

        foreach ($files as $file) {
            $raw = File::get($file->getPathname());
            if (! preg_match('/^---\s*\r?\n(.*?)\r?\n---\s*\r?\n(.*)$/s', $raw, $m)) {
                $this->warn("Skipping {$file->getFilename()} — invalid frontmatter");

                continue;
            }

            /** @var array<string, mixed> $meta */
            $meta = Yaml::parse($m[1]) ?? [];
            $bodyMd = trim($m[2]);
            $slug = $file->getFilenameWithoutExtension();

            $exists = Article::query()->where('slug', $slug)->first();
            if ($exists && ! $this->option('force')) {
                continue;
            }

            $coverLegacy = $this->coverLegacyPaths[$imported % count($this->coverLegacyPaths)];
            $coverRef = LegacyMediaMap::resolveStorageReference($coverLegacy) ?? $coverLegacy;
            $coverPath = str_starts_with($coverRef, '/storage/')
                ? ltrim(substr($coverRef, strlen('/storage/')), '/')
                : MediaUrl::reference($coverRef);

            $words = str_word_count(strip_tags($bodyMd));
            $minutes = max(2, (int) round($words / 220));

            Article::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'title' => (string) ($meta['title'] ?? $slug),
                    'excerpt' => (string) ($meta['excerpt'] ?? ''),
                    'content' => $this->markdownToHtml($bodyMd),
                    'kicker' => (string) ($meta['kicker'] ?? 'یادداشت'),
                    'reading_time' => $minutes.' دقیقه',
                    'featured_image' => $coverPath,
                    'meta_title' => (string) ($meta['title'] ?? $slug),
                    'meta_description' => (string) ($meta['excerpt'] ?? ''),
                    'status' => 'published',
                    'published_at' => isset($meta['date']) ? $meta['date'] : now(),
                    'is_indexable' => true,
                ],
            );

            $imported++;
        }

        $this->info("Imported {$imported} insight articles.");

        return self::SUCCESS;
    }

    private function markdownToHtml(string $markdown): string
    {
        $lines = preg_split('/\r?\n/', $markdown) ?: [];
        $html = [];
        $inBlockquote = false;
        $inTable = false;
        $tableRows = [];

        $flushTable = function () use (&$html, &$tableRows, &$inTable) {
            if (! $inTable) {
                return;
            }
            $html[] = '<table><tbody>';
            foreach ($tableRows as $i => $row) {
                $cells = array_map('trim', explode('|', trim($row, '| ')));
                $tag = $i === 0 ? 'th' : 'td';
                $html[] = '<tr>'.implode('', array_map(fn ($c) => "<{$tag}>".e($c)."</{$tag}>", $cells)).'</tr>';
            }
            $html[] = '</tbody></table>';
            $tableRows = [];
            $inTable = false;
        };

        foreach ($lines as $line) {
            $trim = trim($line);

            if (str_starts_with($trim, '|') && str_contains($trim, '|')) {
                if (preg_match('/^\|[-| :]+\|$/', $trim)) {
                    continue;
                }
                if ($inBlockquote) {
                    $html[] = '</blockquote>';
                    $inBlockquote = false;
                }
                $inTable = true;
                $tableRows[] = $trim;
                continue;
            }

            $flushTable();

            if ($trim === '') {
                if ($inBlockquote) {
                    $html[] = '</blockquote>';
                    $inBlockquote = false;
                }
                continue;
            }

            if (str_starts_with($trim, '### ')) {
                if ($inBlockquote) {
                    $html[] = '</blockquote>';
                    $inBlockquote = false;
                }
                $html[] = '<h3>'.e(substr($trim, 4)).'</h3>';
                continue;
            }

            if (str_starts_with($trim, '## ')) {
                if ($inBlockquote) {
                    $html[] = '</blockquote>';
                    $inBlockquote = false;
                }
                $html[] = '<h2>'.e(substr($trim, 3)).'</h2>';
                continue;
            }

            if (str_starts_with($trim, '> ')) {
                if (! $inBlockquote) {
                    $html[] = '<blockquote>';
                    $inBlockquote = true;
                }
                $html[] = '<p>'.e(substr($trim, 2)).'</p>';
                continue;
            }

            if ($inBlockquote) {
                $html[] = '</blockquote>';
                $inBlockquote = false;
            }

            $text = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', e($trim)) ?? e($trim);
            $html[] = "<p>{$text}</p>";
        }

        $flushTable();
        if ($inBlockquote) {
            $html[] = '</blockquote>';
        }

        return implode("\n", $html);
    }
}
