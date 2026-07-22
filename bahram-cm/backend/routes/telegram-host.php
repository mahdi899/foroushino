<?php

use App\Modules\TelegramBot\Http\Controllers\TelegramHostLiveController;
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

        // Live — never cache; host calls these at purchase/identity time.
        Route::prefix('live')->group(function (): void {
            Route::post('/process-update', [TelegramHostLiveController::class, 'processUpdate'])->middleware('throttle:120,1');
            Route::post('/discount/preview', [TelegramHostLiveController::class, 'discountPreview']);
            Route::post('/access/owns', [TelegramHostLiveController::class, 'accessOwns']);
            Route::post('/product/present', [TelegramHostLiveController::class, 'productPresent']);
            Route::post('/checkout/flags', [TelegramHostLiveController::class, 'checkoutFlags']);
            Route::post('/checkout/zarinpal/start', [TelegramHostLiveController::class, 'checkoutZarinpalStart'])->middleware('throttle:30,1');
            Route::post('/checkout/c2c/start', [TelegramHostLiveController::class, 'checkoutC2cStart'])->middleware('throttle:30,1');
            Route::post('/user/profile', [TelegramHostLiveController::class, 'userProfile']);
            Route::post('/referral/summary', [TelegramHostLiveController::class, 'referralSummary']);
            Route::post('/family/summary', [TelegramHostLiveController::class, 'familySummary']);
            Route::post('/sat/open', [TelegramHostLiveController::class, 'satOpen']);
            Route::post('/support/prepare', [TelegramHostLiveController::class, 'supportPrepare']);
            Route::post('/support/send', [TelegramHostLiveController::class, 'supportSend'])->middleware('throttle:30,1');
            Route::post('/support/try-reply', [TelegramHostLiveController::class, 'supportTryReply'])->middleware('throttle:30,1');
        });
    });
