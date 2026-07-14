<?php

use App\Http\Controllers\Api\V1\Wallet\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('wallet')->group(function (): void {
    Route::get('/', [WalletController::class, 'show']);
    Route::patch('/bank-card', [WalletController::class, 'updateBankCard'])->middleware('throttle:writes');
    Route::get('/transactions', [WalletController::class, 'transactions']);
    Route::get('/commissions', [WalletController::class, 'commissions']);
    Route::get('/commissions/queue', [WalletController::class, 'commissionQueue']);
    Route::get('/commissions/{commission}', [WalletController::class, 'showCommission']);
    Route::post('/commissions/{commission}/approve-leader', [WalletController::class, 'approveCommissionLeader'])->middleware('throttle:writes');
    Route::post('/commissions/{commission}/approve-supervisor', [WalletController::class, 'approveCommissionSupervisor'])->middleware('throttle:writes');
    Route::post('/commissions/{commission}/reject', [WalletController::class, 'rejectCommission'])->middleware('throttle:writes');
    Route::get('/payout-requests', [WalletController::class, 'payoutRequests']);
    Route::post('/payout-requests', [WalletController::class, 'requestPayout'])
        ->middleware(['throttle:writes', 'idempotent']);
    Route::get('/payout-queue', [WalletController::class, 'payoutQueue']);
    Route::post('/payout-requests/{payoutRequest}/approve', [WalletController::class, 'approvePayout'])->middleware('throttle:writes');
    Route::post('/payout-requests/{payoutRequest}/reject', [WalletController::class, 'rejectPayout'])->middleware('throttle:writes');
    Route::post('/commissions/{commission}/release', [WalletController::class, 'releaseCommission'])->middleware('throttle:writes');
});
