<?php

use App\Http\Controllers\Api\V1\Admin\CampaignController;
use App\Http\Controllers\Api\V1\Admin\IntegrationTokenController;
use App\Http\Controllers\Api\V1\Admin\ObjectionController;
use App\Http\Controllers\Api\V1\Admin\ProductController;
use App\Http\Controllers\Api\V1\Admin\ScriptController;
use App\Http\Controllers\Api\V1\Admin\SettingsController;
use App\Http\Controllers\Api\V1\Admin\TeamAdminController;
use App\Http\Controllers\Api\V1\Admin\UserAdminController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->middleware('throttle:writes')->group(function (): void {
    Route::get('/settings', [SettingsController::class, 'show'])->withoutMiddleware('throttle:writes');
    Route::patch('/settings', [SettingsController::class, 'update']);

    Route::get('/users', [UserAdminController::class, 'index'])->withoutMiddleware('throttle:writes');
    Route::post('/users', [UserAdminController::class, 'store']);
    Route::patch('/users/{user}', [UserAdminController::class, 'update']);

    Route::get('/teams', [TeamAdminController::class, 'index'])->withoutMiddleware('throttle:writes');
    Route::post('/teams', [TeamAdminController::class, 'store']);
    Route::patch('/teams/{team}', [TeamAdminController::class, 'update']);

    Route::get('/scripts', [ScriptController::class, 'index'])->withoutMiddleware('throttle:writes');
    Route::post('/scripts', [ScriptController::class, 'store']);
    Route::patch('/scripts/{script}', [ScriptController::class, 'update']);
    Route::delete('/scripts/{script}', [ScriptController::class, 'destroy']);

    Route::get('/objections', [ObjectionController::class, 'index'])->withoutMiddleware('throttle:writes');
    Route::post('/objections', [ObjectionController::class, 'store']);
    Route::patch('/objections/{objection}', [ObjectionController::class, 'update']);
    Route::delete('/objections/{objection}', [ObjectionController::class, 'destroy']);

    Route::get('/products', [ProductController::class, 'index'])->withoutMiddleware('throttle:writes');
    Route::post('/products', [ProductController::class, 'store']);
    Route::patch('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::get('/campaigns', [CampaignController::class, 'index'])->withoutMiddleware('throttle:writes');
    Route::post('/campaigns', [CampaignController::class, 'store']);
    Route::patch('/campaigns/{campaign}', [CampaignController::class, 'update']);
    Route::delete('/campaigns/{campaign}', [CampaignController::class, 'destroy']);

    Route::get('/integration-tokens', [IntegrationTokenController::class, 'index']);
    Route::post('/integration-tokens', [IntegrationTokenController::class, 'store']);
    Route::delete('/integration-tokens/{integrationToken}', [IntegrationTokenController::class, 'destroy']);
});
