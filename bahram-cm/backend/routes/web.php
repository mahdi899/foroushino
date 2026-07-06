<?php

use App\Http\Controllers\Admin\LeadExportController;
use App\Http\Controllers\Admin\OrderExportController;
use App\Models\SeoSetting;
use App\Services\SitemapService;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware(['web', 'auth'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/leads/export', LeadExportController::class)->name('leads.export');
    Route::get('/orders/export', OrderExportController::class)->name('orders.export');
});

Route::get('/sitemap.xml', function (SitemapService $sitemap) {
    return response($sitemap->current(), 200, ['Content-Type' => 'application/xml']);
});

Route::get('/robots.txt', function () {
    $settings = SeoSetting::current();
    $content = filled($settings->robots_txt) ? $settings->robots_txt : app(SitemapService::class)->defaultRobotsTxt();

    return response($content, 200, ['Content-Type' => 'text/plain']);
});
