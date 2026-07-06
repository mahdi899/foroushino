<?php

use App\Http\Controllers\Api\V1\Home\HomeController;
use Illuminate\Support\Facades\Route;

Route::prefix('home')->group(function (): void {
    Route::get('/agent', [HomeController::class, 'agent']);
    Route::get('/management', [HomeController::class, 'management']);
});
