<?php

use App\Http\Middleware\EnsureIdempotency;
use App\Http\Middleware\ForceJsonResponse;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            ForceJsonResponse::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'idempotent' => EnsureIdempotency::class,
            'integration.token' => \App\Http\Middleware\AuthenticateIntegrationToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => true);

        $exceptions->render(function (ValidationException $e, Request $request) {
            return ApiResponse::validationError($e->errors());
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return ApiResponse::error('احراز هویت نشده‌اید.', status: 401, code: 'unauthenticated');
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            return ApiResponse::error('اجازه دسترسی به این بخش را ندارید.', status: 403, code: 'forbidden');
        });

        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            return ApiResponse::error('موردی یافت نشد.', status: 404, code: 'not_found');
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            return ApiResponse::error('مسیر مورد نظر یافت نشد.', status: 404, code: 'not_found');
        });

        $exceptions->render(function (TooManyRequestsHttpException $e, Request $request) {
            return ApiResponse::error('تعداد درخواست‌ها بیش از حد مجاز است.', status: 429, code: 'too_many_requests');
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            return ApiResponse::error($e->getMessage() ?: 'خطایی رخ داد.', status: $e->getStatusCode(), code: 'http_error');
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if (app()->hasDebugModeEnabled()) {
                return ApiResponse::error($e->getMessage(), data: [
                    'exception' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ], status: 500, code: 'server_error');
            }

            return ApiResponse::error('خطای داخلی سرور رخ داد.', status: 500, code: 'server_error');
        });
    })->create();
