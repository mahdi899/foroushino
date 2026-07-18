<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust only the local reverse proxy (Nginx) — set TRUSTED_PROXIES for Cloudflare.
        $trusted = env('TRUSTED_PROXIES', '127.0.0.1');
        $middleware->trustProxies(at: $trusted === '*' ? '*' : array_map('trim', explode(',', $trusted)));

        $middleware->api(prepend: [
            \Illuminate\Routing\Middleware\ThrottleRequests::class.':api',
        ]);

        // API / JSON clients must get 401 — never redirect to a missing web `login` route.
        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return null;
            }

            return null;
        });

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'family.manage' => \App\Http\Middleware\EnsureUserCanManageFamily::class,
            'sat.staff' => \App\Http\Middleware\EnsureUserIsSatStaff::class,
            'sat.integration' => \App\Http\Middleware\AuthenticateSatIntegrationToken::class,
            'student.active' => \App\Http\Middleware\EnsureStudentIsActive::class,
            'proxy.origin' => \App\Http\Middleware\EnsureProxyOrigin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Public API errors always use the { error: { code, message_fa, details? } } envelope.
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            if ($e instanceof ValidationException) {
                $errors = $e->errors();
                $messageFa = 'اطلاعات ارسال‌شده معتبر نیست.';
                if (isset($errors['coupon'][0])) {
                    $messageFa = $errors['coupon'][0];
                } elseif (count($errors) === 1) {
                    $first = collect($errors)->flatten()->first();
                    if (is_string($first) && $first !== '') {
                        $messageFa = $first;
                    }
                }

                return response()->json([
                    'error' => [
                        'code' => 'validation_error',
                        'message_fa' => $messageFa,
                        'details' => $errors,
                    ],
                ], 422);
            }

            if ($e instanceof AuthenticationException) {
                return response()->json([
                    'error' => [
                        'code' => 'unauthenticated',
                        'message_fa' => 'برای انجام این عملیات باید وارد شوید.',
                    ],
                ], 401);
            }

            if ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();

                return response()->json([
                    'error' => [
                        'code' => match ($status) {
                            404 => 'not_found',
                            403 => 'forbidden',
                            429 => 'too_many_requests',
                            default => 'http_error',
                        },
                        'message_fa' => match ($status) {
                            404 => 'موردی یافت نشد.',
                            403 => 'اجازه دسترسی ندارید.',
                            405 => 'این عملیات روی سرور پشتیبانی نمی‌شود.',
                            429 => $request->is('api/v1/auth/login')
                                ? 'حداکثر ۳ بار در هر ساعت می‌توانید وارد شوید. لطفاً بعداً دوباره تلاش کنید.'
                                : 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
                            default => 'خطایی رخ داد.',
                        },
                    ],
                ], $status);
            }

            // Never leak file paths, DB structure, or stack traces to API clients —
            // regardless of APP_DEBUG. Laravel's default reporter still logs the
            // full exception; only the client-facing payload is sanitized here.
            return response()->json([
                'error' => [
                    'code' => 'server_error',
                    'message_fa' => 'خطای غیرمنتظره‌ای در سرور رخ داد. لطفاً بعداً تلاش کنید.',
                ],
            ], 500);
        });
    })->create();
