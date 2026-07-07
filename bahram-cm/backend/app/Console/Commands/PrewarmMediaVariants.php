<?php

namespace App\Console\Commands;

use App\Models\Media;
use App\Services\MediaDeliveryService;
use Illuminate\Console\Command;

class PrewarmMediaVariants extends Command
{
    protected $signature = 'media:prewarm-variants {--path= : Single storage path under media/}';

    protected $description = 'Pre-generate common CDN image widths for faster first paint';

    public function handle(MediaDeliveryService $delivery): int
    {
        $single = $this->option('path');
        $paths = $single
            ? collect([(string) $single])
            : Media::query()
                ->where('is_private', false)
                ->where('type', 'image')
                ->pluck('path');

        $warmed = 0;
        foreach ($paths as $path) {
            if (! is_string($path) || $path === '') {
                continue;
            }
            $delivery->prewarmStandardWidths($path);
            $warmed++;
        }

        $this->info("Prewarmed variants for {$warmed} image(s).");

        return self::SUCCESS;
    }
}
