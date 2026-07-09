<?php

namespace Database\Seeders;

use App\Models\StudentTestimonial;
use App\Support\StudentTestimonialPortraits;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class StudentTestimonialSeeder extends Seeder
{
    public function run(): void
    {
        $dir = realpath(base_path('../frontend/content/transformations'));
        if (! $dir || ! is_dir($dir)) {
            $this->command?->warn('MDX directory not found; skipping student testimonial import.');

            return;
        }

        $featured = ['sara-r', 'amir-h', 'nazanin-k', 'reza-m'];
        $paths = File::glob($dir.'/*.mdx') ?: [];
        usort($paths, function (string $a, string $b) use ($featured): int {
            $slugA = pathinfo($a, PATHINFO_FILENAME);
            $slugB = pathinfo($b, PATHINFO_FILENAME);

            return array_search($slugA, $featured, true) <=> array_search($slugB, $featured, true);
        });

        $sort = 0;

        foreach ($paths as $path) {
            $slug = pathinfo($path, PATHINFO_FILENAME);
            if (! in_array($slug, $featured, true)) {
                continue;
            }
            $raw = File::get($path);

            if (! preg_match('/^---\s*\n(.*?)\n---\s*\n(.*)$/s', $raw, $m)) {
                continue;
            }

            $front = $this->parseFrontMatter($m[1]);
            $body = trim($m[2]);

            StudentTestimonial::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $front['name'] ?? $slug,
                    'role' => $front['role'] ?? 'دانشجو',
                    'before_text' => $front['before'] ?? '',
                    'after_text' => $front['after'] ?? '',
                    'summary' => $front['summary'] ?? mb_substr(strip_tags($body), 0, 170),
                    'metric_label' => $front['metricLabel'] ?? null,
                    'metric_value' => $front['metricValue'] ?? null,
                    'body' => $body,
                    'portrait_image' => StudentTestimonialPortraits::forSlug($slug),
                    'sort_order' => $sort++,
                    'is_active' => true,
                ],
            );
        }

        StudentTestimonial::query()
            ->whereNotIn('slug', $featured)
            ->delete();
    }

    /** @return array<string, string> */
    private function parseFrontMatter(string $yaml): array
    {
        $out = [];
        foreach (preg_split('/\r\n|\r|\n/', $yaml) as $line) {
            if (! preg_match('/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/', trim($line), $m)) {
                continue;
            }
            $value = trim($m[2]);
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }
            $out[$m[1]] = $value;
        }

        return $out;
    }
}
