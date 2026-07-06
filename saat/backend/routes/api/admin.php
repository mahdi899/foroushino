<?php

use App\Http\Controllers\Api\V1\Admin\CampaignController;
use App\Http\Controllers\Api\V1\Admin\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->middleware('throttle:writes')->group(function (): void {
    Route::get('/products', [ProductController::class, 'index'])->withoutMiddleware('throttle:writes');
    Route::post('/products', [ProductController::class, 'store']);
    Route::patch('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::get('/campaigns', [CampaignController::class, 'index'])->withoutMiddleware('throttle:writes');
    Route::post('/campaigns', [CampaignController::class, 'store']);
    Route::patch('/campaigns/{campaign}', [CampaignController::class, 'update']);
    Route::delete('/campaigns/{campaign}', [CampaignController::class, 'destroy']);
});
