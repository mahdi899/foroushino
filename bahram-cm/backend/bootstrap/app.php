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
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Next.js proxies /admin (and related paths) with X-Forwarded-* headers.
        $middleware->trustProxies(at: '*');

        // API / JSON clients must get 401 — never redirect to a missing web `login` route.
        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return null;
            }

            return null;
        });

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'student.active' => \App\Http\Middleware\EnsureStudentIsActive::class,
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
                            429 => 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
                            default => 'خطایی رخ داد.',
                        },
                    ],
                ], $status);
            }

            $status = 500;

            return response()->json([
                'error' => [
                    'code' => 'server_error',
                    'message_fa' => 'خطای غیرمنتظره‌ای در سرور رخ داد. لطفاً بعداً تلاش کنید.',
                    'details' => config('app.debug') ? $e->getMessage() : null,
                ],
            ], $status);
        });
    })->create();
