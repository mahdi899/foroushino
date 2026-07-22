<?php

use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramAccountAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramBotAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramBroadcastAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramDestinationAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramInfrastructureAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramHealthAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramLogAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramMessageAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramRequiredChatAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramStatsAdminController;
use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramSupportAdminController;
use App\Modules\TelegramBot\Http\Controllers\IdentityStatusController;
use App\Modules\TelegramBot\Http\Controllers\MiniAppAuthController;
use App\Modules\TelegramBot\Http\Controllers\WebhookController;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Support\Facades\Route;

// Telegram → Cloudflare Worker (dumb relay) → this route with
// `Authorization: Bearer <PROXY_SHARED_TOKEN>` + `X-Proxy-Origin` injected.
// Webhook secret validation happens here (`telegram.webhook` middleware).
Route::post(
    '/api/v1/integrations/telegram/{botKey}/webhook',
    WebhookController::class,
)->middleware(['proxy.origin:strict', 'telegram.webhook', 'throttle:120,1']);

Route::post('/api/v1/telegram/miniapp/auth', MiniAppAuthController::class)
    ->middleware('throttle:30,1');

Route::middleware(['auth:sanctum', SubstituteBindings::class])->group(function (): void {
    Route::get('/api/v1/telegram/identity/status', [IdentityStatusController::class, 'status']);

    Route::middleware('admin')->prefix('api/v1/panel/telegram')->group(function (): void {
        Route::get('/health', TelegramHealthAdminController::class);
        Route::get('/stats', TelegramStatsAdminController::class);

        Route::get('/infrastructure', [TelegramInfrastructureAdminController::class, 'show']);
        Route::patch('/infrastructure', [TelegramInfrastructureAdminController::class, 'update']);
        Route::post('/infrastructure/register-webhook', [TelegramInfrastructureAdminController::class, 'registerWebhook']);
        Route::post('/infrastructure/test', [TelegramInfrastructureAdminController::class, 'test']);
        Route::post('/infrastructure/suggest-secrets', [TelegramInfrastructureAdminController::class, 'suggestSecrets']);

        Route::get('/bots', [TelegramBotAdminController::class, 'index']);
        Route::post('/bots/sync', [TelegramBotAdminController::class, 'syncFromConfig']);
        Route::get('/bots/{bot}', [TelegramBotAdminController::class, 'show']);
        Route::patch('/bots/{bot}', [TelegramBotAdminController::class, 'update']);
        Route::post('/bots/{bot}/webhook/set', [TelegramBotAdminController::class, 'setWebhook']);
        Route::post('/bots/{bot}/webhook/delete', [TelegramBotAdminController::class, 'deleteWebhook']);
        Route::get('/bots/{bot}/webhook/info', [TelegramBotAdminController::class, 'webhookInfo']);
        Route::get('/bots/{bot}/profile', [TelegramBotAdminController::class, 'profile']);
        Route::put('/bots/{bot}/profile', [TelegramBotAdminController::class, 'updateProfile']);
        Route::post('/bots/{bot}/profile/photo', [TelegramBotAdminController::class, 'updateProfilePhoto']);
        Route::delete('/bots/{bot}/profile/photo', [TelegramBotAdminController::class, 'removeProfilePhoto']);

        Route::get('/accounts', [TelegramAccountAdminController::class, 'index']);
        Route::get('/accounts/export', [TelegramAccountAdminController::class, 'export']);
        Route::post('/accounts/grant-bot-admin', [TelegramAccountAdminController::class, 'grantBotAdminByTelegramUserId']);
        Route::get('/accounts/{account}', [TelegramAccountAdminController::class, 'show']);
        Route::patch('/accounts/{account}', [TelegramAccountAdminController::class, 'update']);
        Route::post('/accounts/{account}/unlink', [TelegramAccountAdminController::class, 'unlink']);
        Route::post('/accounts/{account}/bot-admin', [TelegramAccountAdminController::class, 'setBotAdmin']);
        Route::post('/accounts/{account}/invalidate-membership-cache', [TelegramAccountAdminController::class, 'invalidateMembershipCache']);

        Route::get('/required-chats', [TelegramRequiredChatAdminController::class, 'index']);
        Route::post('/required-chats', [TelegramRequiredChatAdminController::class, 'store']);
        Route::patch('/required-chats/{requiredChat}', [TelegramRequiredChatAdminController::class, 'update']);
        Route::delete('/required-chats/{requiredChat}', [TelegramRequiredChatAdminController::class, 'destroy']);

        Route::get('/destinations', [TelegramDestinationAdminController::class, 'index']);
        Route::post('/destinations', [TelegramDestinationAdminController::class, 'store']);
        Route::get('/destinations/{destination}', [TelegramDestinationAdminController::class, 'show']);
        Route::patch('/destinations/{destination}', [TelegramDestinationAdminController::class, 'update']);
        Route::delete('/destinations/{destination}', [TelegramDestinationAdminController::class, 'destroy']);
        Route::post('/destinations/{destination}/requirements', [TelegramDestinationAdminController::class, 'storeRequirement']);
        Route::delete('/destinations/{destination}/requirements/{requirement}', [TelegramDestinationAdminController::class, 'destroyRequirement']);

        Route::get('/broadcasts', [TelegramBroadcastAdminController::class, 'index']);
        Route::post('/broadcasts', [TelegramBroadcastAdminController::class, 'store']);
        Route::get('/broadcasts/{broadcast}', [TelegramBroadcastAdminController::class, 'show']);
        Route::patch('/broadcasts/{broadcast}', [TelegramBroadcastAdminController::class, 'update']);
        Route::post('/broadcasts/{broadcast}/approve', [TelegramBroadcastAdminController::class, 'approve']);
        Route::post('/broadcasts/{broadcast}/dispatch', [TelegramBroadcastAdminController::class, 'dispatch']);
        Route::post('/broadcasts/{broadcast}/send-now', [TelegramBroadcastAdminController::class, 'sendNow']);
        Route::post('/broadcasts/{broadcast}/stop', [TelegramBroadcastAdminController::class, 'stop']);
        Route::post('/broadcasts/{broadcast}/test', [TelegramBroadcastAdminController::class, 'test']);
        Route::get('/broadcast-segments', [TelegramBroadcastAdminController::class, 'segments']);

        Route::get('/messages', [TelegramMessageAdminController::class, 'index']);
        Route::put('/messages/{key}', [TelegramMessageAdminController::class, 'update']);
        Route::post('/messages/{key}/reset', [TelegramMessageAdminController::class, 'reset']);

        Route::get('/support/categories', [TelegramSupportAdminController::class, 'categories']);
        Route::post('/support/categories', [TelegramSupportAdminController::class, 'storeCategory']);
        Route::patch('/support/categories/{category}', [TelegramSupportAdminController::class, 'updateCategory']);
        Route::delete('/support/categories/{category}', [TelegramSupportAdminController::class, 'destroyCategory']);

        Route::get('/operators', [TelegramSupportAdminController::class, 'operators']);
        Route::post('/operators', [TelegramSupportAdminController::class, 'storeOperator']);
        Route::patch('/operators/{operator}', [TelegramSupportAdminController::class, 'updateOperator']);
        Route::delete('/operators/{operator}', [TelegramSupportAdminController::class, 'destroyOperator']);

        Route::get('/updates', [TelegramLogAdminController::class, 'updates']);
        Route::get('/updates/{update}', [TelegramLogAdminController::class, 'showUpdate']);
        Route::post('/updates/retry-failed', [TelegramLogAdminController::class, 'retryFailed']);
        Route::get('/delivery-logs', [TelegramLogAdminController::class, 'deliveryLogs']);
    });
});

Route::post('/api/v1/telegram/identity/session', [IdentityStatusController::class, 'session'])
    ->middleware('throttle:20,1');

// External "host" bridge sync API (standalone PHP app on cPanel, see telegram/).
require __DIR__.'/telegram-host.php';
