<?php

use App\Http\Controllers\Api\V1\Misc\ActivityController;
use App\Http\Controllers\Api\V1\Misc\AppConfigController;
use App\Http\Controllers\Api\V1\Misc\CatalogController;
use App\Http\Controllers\Api\V1\Misc\NotificationController;
use App\Http\Controllers\Api\V1\Shift\ShiftController;
use Illuminate\Support\Facades\Route;

Route::prefix('notifications')->group(function (): void {
    Route::get('/', [NotificationController::class, 'index']);
    Route::post('/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('/read-all', [NotificationController::class, 'markAllRead']);
});

Route::get('/activity', [ActivityController::class, 'index']);
Route::get('/app-config', AppConfigController::class);

Route::get('/products', [CatalogController::class, 'products']);
Route::get('/products/{product:slug}', [CatalogController::class, 'showProduct']);
Route::get('/lead-sources', [CatalogController::class, 'leadSources']);
Route::get('/scripts', [CatalogController::class, 'scripts']);
Route::get('/objections', [CatalogController::class, 'objections']);

Route::prefix('shift')->group(function (): void {
    Route::get('/current', [ShiftController::class, 'current']);
    Route::get('/history', [ShiftController::class, 'history']);
    Route::post('/start', [ShiftController::class, 'start'])->middleware('throttle:writes');
    Route::post('/end', [ShiftController::class, 'end'])->middleware('throttle:writes');
    Route::post('/availability', [ShiftController::class, 'setAvailability'])->middleware('throttle:writes');
});
