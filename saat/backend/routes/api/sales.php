<?php

use App\Http\Controllers\Api\V1\Sales\SaleController;
use Illuminate\Support\Facades\Route;

Route::prefix('sales')->group(function (): void {
    Route::get('/', [SaleController::class, 'index']);
    Route::get('/pending-payments', [SaleController::class, 'pendingPayments']);
    Route::get('/pending-confirmation', [SaleController::class, 'pendingConfirmation']);
    Route::get('/{sale}', [SaleController::class, 'show']);
    Route::post('/{sale}/submit-payment', [SaleController::class, 'submitPayment'])
        ->middleware(['throttle:writes', 'idempotent']);
    Route::post('/{sale}/confirm', [SaleController::class, 'confirm'])
        ->middleware(['throttle:writes', 'idempotent']);
    Route::post('/{sale}/reject', [SaleController::class, 'reject'])->middleware('throttle:writes');
    Route::post('/{sale}/cancel', [SaleController::class, 'cancel'])->middleware('throttle:writes');
});
