<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\FamilySeeder;
use Database\Seeders\FamilyStorySeeder;
use Database\Seeders\Support\FamilyDemoAssets;
use Database\Seeders\Support\FamilyDemoPublisher;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class RefreshFamilyDemo extends Command
{
    protected $signature = 'family:refresh-demo
                            {--skip-seed : Only sync demo files to storage/FTP, skip FamilySeeder}
                            {--force : Allow running in production (local/staging only by default)}';

    protected $description = 'Re-deploy family demo media (voice/video/images) to download host and refresh demo posts';

    public function handle(FamilyDemoPublisher $publisher): int
    {
        if (app()->environment('production') && ! $this->option('force')) {
            $this->error('family:refresh-demo is blocked in production (would re-publish demo posts). Use --force only if you really mean it.');

            return self::FAILURE;
        }

        $author = User::query()
            ->where('email', 'admin@bahram.local')
            ->where('is_admin', true)
            ->first();

        if (! $author) {
            $this->error('admin@bahram.local not found — run php artisan db:seed first.');

            return self::FAILURE;
        }

        $this->info('Deploying demo binaries to storage…');
        $assets = (new FamilyDemoAssets)->deploy($author);

        $this->info('Publishing demo media to download host…');
        $stats = $publisher->publishAll($assets);
        $this->line(sprintf(
            '  FTP: %d · local-only: %d · failed: %d',
            $stats['uploaded'],
            $stats['local'],
            $stats['failed'],
        ));

        foreach ($assets as $key => $media) {
            $this->line(sprintf(
                '  %-14s #%d disk=%s path=%s',
                $key,
                $media->id,
                $media->disk,
                $media->storage_path,
            ));
        }

        if (! $this->option('skip-seed')) {
            $this->info('Refreshing demo posts & stories…');
            Artisan::call('db:seed', ['--class' => FamilySeeder::class, '--force' => true], $this->getOutput());
            Artisan::call('db:seed', ['--class' => FamilyStorySeeder::class, '--force' => true], $this->getOutput());
        }

        Artisan::call('cache:clear');
        $this->info('Done. Demo voice/video should stream via /api/family/media/{id}/stream');

        return self::SUCCESS;
    }
}
