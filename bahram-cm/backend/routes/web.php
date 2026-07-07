<?php

use App\Http\Controllers\MediaDeliveryController;
use App\Models\SeoSetting;
use App\Services\SitemapService;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/cdn/{path}', [MediaDeliveryController::class, 'show'])
    ->where('path', 'media/.*')
    ->name('cdn.media');

/** @deprecated Legacy double-/media/ URLs — kept for old cached links */
Route::get('/cdn/media/{path}', [MediaDeliveryController::class, 'show'])
    ->where('path', '.*')
    ->name('cdn.media.legacy');

Route::get('/sitemap.xml', function (SitemapService $sitemap) {
    return response($sitemap->current(), 200, [
        'Content-Type' => 'application/xml',
        'Cache-Control' => 'public, max-age=3600, stale-while-revalidate=7200',
        'CDN-Cache-Control' => 'public, max-age=3600',
    ]);
});

Route::get('/robots.txt', function () {
    $settings = SeoSetting::current();
    $content = filled($settings->robots_txt) ? $settings->robots_txt : app(SitemapService::class)->defaultRobotsTxt();

    return response($content, 200, [
        'Content-Type' => 'text/plain',
        'Cache-Control' => 'public, max-age=3600, stale-while-revalidate=7200',
        'CDN-Cache-Control' => 'public, max-age=3600',
    ]);
});
