<?php

namespace App\Jobs\Family;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;

/** Debounced manifest export after family media is indexed in the site library. */
class ExportFamilyMediaToSiteLibraryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        Artisan::call('media:sync', ['--export' => true]);
        Artisan::call('media:export-legacy-map');
    }
}
