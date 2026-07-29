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
| then `telegram.host.token` (Bearer `host_sync_secret` + JSON body over HTTPS).
|
*/
Route::middleware(['proxy.origin:presence', 'telegram.host.signature', 'throttle:120,1'])
    ->prefix('api/v1/integrations/telegram-host')
    ->group(function (): void {
        Route::post('/bootstrap', [TelegramHostSyncController::class, 'bootstrap']);
        Route::post('/sync-meta', [TelegramHostSyncController::class, 'syncMeta']);
        Route::post('/catalog', [TelegramHostSyncController::class, 'catalog']);
        Route::post('/webhook-register/ack', [TelegramHostSyncController::class, 'webhookRegisterAck']);
        Route::post('/otp/request', [TelegramHostSyncController::class, 'otpRequest'])->middleware('throttle:20,1');
        Route::post('/otp/verify', [TelegramHostSyncController::class, 'otpVerify'])->middleware('throttle:20,1');
        Route::post('/capacity-check', [TelegramHostSyncController::class, 'capacityCheck']);
        Route::post('/discount/validate', [TelegramHostSyncController::class, 'discountValidate']);
        Route::post('/account/fetch', [TelegramHostSyncController::class, 'accountFetch']);
        Route::post('/registration/start', [TelegramHostSyncController::class, 'registrationStart'])->middleware('throttle:60,1');
        Route::post('/registration/contact', [TelegramHostSyncController::class, 'registrationContact'])->middleware('throttle:30,1');
        Route::post('/registration/name', [TelegramHostSyncController::class, 'registrationName'])->middleware('throttle:30,1');
        Route::post('/registration/callback', [TelegramHostSyncController::class, 'registrationCallback'])->middleware('throttle:60,1');

        // Live — never cache; host calls these at purchase/identity time.
        Route::prefix('live')->group(function (): void {
            Route::post('/process-update', [TelegramHostLiveController::class, 'processUpdate'])->middleware('throttle:120,1');
            Route::post('/admin/fast', [TelegramHostLiveController::class, 'adminFast'])->middleware('throttle:180,1');
            Route::post('/discount/preview', [TelegramHostLiveController::class, 'discountPreview']);
            Route::post('/access/owns', [TelegramHostLiveController::class, 'accessOwns']);
            Route::post('/product/present', [TelegramHostLiveController::class, 'productPresent']);
            Route::post('/checkout/flags', [TelegramHostLiveController::class, 'checkoutFlags']);
            Route::post('/checkout/zarinpal/start', [TelegramHostLiveController::class, 'checkoutZarinpalStart'])->middleware('throttle:30,1');
            Route::post('/checkout/c2c/start', [TelegramHostLiveController::class, 'checkoutC2cStart'])->middleware('throttle:30,1');
            Route::post('/checkout/revoke-open', [TelegramHostLiveController::class, 'checkoutRevokeOpen'])->middleware('throttle:60,1');
            Route::post('/user/profile', [TelegramHostLiveController::class, 'userProfile']);
            Route::post('/referral/summary', [TelegramHostLiveController::class, 'referralSummary']);
            Route::post('/family/summary', [TelegramHostLiveController::class, 'familySummary']);
            Route::post('/sat/open', [TelegramHostLiveController::class, 'satOpen']);
            Route::post('/sat/submit', [TelegramHostLiveController::class, 'satSubmit'])->middleware('throttle:30,1');
            Route::post('/support/prepare', [TelegramHostLiveController::class, 'supportPrepare']);
            Route::post('/support/send', [TelegramHostLiveController::class, 'supportSend'])->middleware('throttle:30,1');
            Route::post('/support/try-reply', [TelegramHostLiveController::class, 'supportTryReply'])->middleware('throttle:30,1');
            Route::post('/support/sync-ticket', [TelegramHostLiveController::class, 'supportSyncTicket'])->middleware('throttle:60,1');
            Route::post('/destination-membership/sync', [TelegramHostLiveController::class, 'destinationMembershipSync'])->middleware('throttle:60,1');
        });
    });
