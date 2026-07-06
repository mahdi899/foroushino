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

        $sort = 0;
        $paths = File::glob($dir.'/*.mdx') ?: [];
        sort($paths, SORT_STRING);

        foreach ($paths as $path) {
            $slug = pathinfo($path, PATHINFO_FILENAME);
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
