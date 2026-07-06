<?php

namespace App\Providers;

use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Authenticate::redirectUsing(fn () => route('filament.admin.auth.login'));

        RateLimiter::for('leads', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perDay(50)->by($request->ip()),
            ];
        });

        RateLimiter::for('chatbot', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });
    }
}
