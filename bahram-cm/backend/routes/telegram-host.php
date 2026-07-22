<?php

use App\Modules\TelegramBot\Http\Controllers\TelegramHostSyncController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Telegram "host" bridge sync API
|--------------------------------------------------------------------------
|
| Consumed only by the standalone PHP app in `telegram/` (deployed on an
| external cPanel host). Never called from the browser or the site's own
| frontend. Guarded by `proxy.origin:presence` (Bearer + X-Proxy-Origin)
| then `telegram.host.signature` (HMAC-SHA256 + AES-256-GCM body).
|
*/
Route::middleware(['proxy.origin:presence', 'telegram.host.signature', 'throttle:120,1'])
    ->prefix('api/v1/integrations/telegram-host')
    ->group(function (): void {
        Route::post('/bootstrap', [TelegramHostSyncController::class, 'bootstrap']);
        Route::post('/catalog', [TelegramHostSyncController::class, 'catalog']);
        Route::post('/otp/request', [TelegramHostSyncController::class, 'otpRequest'])->middleware('throttle:20,1');
        Route::post('/otp/verify', [TelegramHostSyncController::class, 'otpVerify'])->middleware('throttle:20,1');
        Route::post('/capacity-check', [TelegramHostSyncController::class, 'capacityCheck']);
        Route::post('/discount/validate', [TelegramHostSyncController::class, 'discountValidate']);
        Route::post('/account/fetch', [TelegramHostSyncController::class, 'accountFetch']);
    });
