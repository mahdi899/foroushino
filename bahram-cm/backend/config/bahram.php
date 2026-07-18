<?php

return [

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    'media_url' => env('MEDIA_URL', ''),

    'asset_url' => env('ASSET_URL', env('APP_URL', 'http://127.0.0.1:8010')),

    'leads' => [
        'rate_limit_per_minute' => (int) env('LEAD_RATE_LIMIT_PER_MINUTE', 5),
    ],

    /*
    | Global API throttle (ThrottleRequests:api). Family/student traffic often
    | arrives via Next.js server actions, so local defaults are higher — the
    | feed alone can exceed 120/min on a single loopback IP during UI testing.
    */
    'api_rate_limit_per_minute' => (int) env(
        'API_RATE_LIMIT_PER_MINUTE',
        env('APP_ENV') === 'local' ? 2000 : 120,
    ),

    'student_auth_rate_limit_per_minute' => (int) env(
        'STUDENT_AUTH_RATE_LIMIT_PER_MINUTE',
        env('APP_ENV') === 'local' ? 60 : 30,
    ),

    'uploads' => [
        'public_disk' => env('MEDIA_DISK', 'public'),
        'private_disk' => 'local',
        'max_image_kb' => (int) env('UPLOAD_MAX_IMAGE_KB', 8192),
        'signed_url_ttl_minutes' => (int) env('UPLOAD_SIGNED_TTL', 15),
        'static_images_path' => env('STATIC_IMAGES_PATH', dirname(base_path()).'/frontend/public/media'),
    ],

    'revalidate' => [
        'webhook_url' => env('REVALIDATE_WEBHOOK_URL') ?: rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/').'/api/revalidate',
        'secret' => env('REVALIDATE_SECRET', 'bahram-dev-revalidate-secret'),
    ],

    'internal_api' => [
        'secret' => env('INTERNAL_API_SECRET', env('REVALIDATE_SECRET', 'bahram-dev-internal-secret')),
    ],

    'cloudflare' => [
        'zone_id' => env('CLOUDFLARE_ZONE_ID'),
        'api_token' => env('CLOUDFLARE_API_TOKEN'),
    ],

    'arvan' => [
        'api_key' => env('ARVAN_API_KEY'),
        'domain' => env('ARVAN_DOMAIN', 'rostami.app'),
        'media_domain' => env('ARVAN_MEDIA_DOMAIN', 'cdn.rostami.app'),
    ],

    /** Active CDN edge provider: arvan | cloudflare | none */
    'cdn_provider' => env('CDN_PROVIDER', 'arvan'),

    'otp' => [
        'dev_mode' => filter_var(env('OTP_DEV_MODE', false), FILTER_VALIDATE_BOOL),
        'dev_code' => env('OTP_DEV_CODE', '12345'),
        // Local-only: email/password login without SMS OTP step (admin + sat panels).
        'skip_admin' => filter_var(env('OTP_SKIP_ADMIN', false), FILTER_VALIDATE_BOOL),
    ],

    'admin_login' => [
        // Production default: 3/hour per IP. Local dev gets a higher ceiling for UI testing.
        'max_per_hour' => (int) env(
            'ADMIN_LOGIN_MAX_PER_HOUR',
            env('APP_ENV') === 'local' ? 60 : 3,
        ),
    ],

    'payment' => [
        'dev_mode' => filter_var(env('PAYMENT_DEV_MODE', false), FILTER_VALIDATE_BOOL),
    ],

    'chatbot' => [
        'retention_days' => (int) env('CHATBOT_RETENTION_DAYS', 60),
    ],

    'backup' => [
        'mysqldump_path' => env('MYSQLDUMP_PATH'),
        'mysql_path' => env('MYSQL_PATH'),
    ],

    'media_cache_max_age' => (int) env('MEDIA_CACHE_MAX_AGE', 31536000),

    'image_optimizer' => [
        'tinify_key' => env('TINIFY_API_KEY'),
        'resmush_enabled' => filter_var(env('RESMUSH_ENABLED', true), FILTER_VALIDATE_BOOL),
        'resmush_quality' => (int) env('RESMUSH_QUALITY', 85),
        'resmush_user_agent' => env('RESMUSH_USER_AGENT', 'BahramCMS/1.0'),
        'resmush_referer' => env('RESMUSH_REFERER', env('FRONTEND_URL', 'http://localhost:3000')),
        'convert_webp' => filter_var(env('IMAGE_OPTIMIZER_WEBP', true), FILTER_VALIDATE_BOOL),
        'webp_quality' => (int) env('IMAGE_OPTIMIZER_WEBP_QUALITY', 85),
        'max_dimension' => (int) env('IMAGE_OPTIMIZER_MAX_DIMENSION', 2560),
        'session_ttl_minutes' => (int) env('IMAGE_OPTIMIZER_SESSION_TTL', 30),
    ],

    'identity' => [
        'national_code_hmac_key' => env('IDENTITY_NATIONAL_CODE_HMAC_KEY', env('APP_KEY')),
        'selfie_min_seconds' => 5,
        'selfie_max_seconds' => 20,
        'selfie_max_mb' => 25,
        'national_card_max_mb' => 8,
        'submit_cooldown_seconds' => 60,
        'ownership_max_attempts' => 3,
        'video_prompts' => [
            'سلام؛ من دانشجوی آکادمی بهرام رستمی هستم و این ویدیو را برای تأیید هویت حساب کاربری‌ام در پنل آکادمی ضبط می‌کنم.',
            'بنام خدا؛ اینجانب مالک این حساب در آکادمی بهرام رستمی هستم و این ویدیوی سلفی را صرفاً جهت احراز هویت ضبط کرده‌ام.',
            'من صاحب این حساب کاربری در آکادمی بهرام رستمی هستم؛ این جمله را با صدای واضح می‌خوانم تا هویت من تأیید شود.',
            'به پنل آکادمی بهرام رستمی خوشحالم که پیوسته‌ام؛ این ویدیو را برای تکمیل فرآیند رسمی تأیید هویت حساب خودم ضبط می‌کنم.',
            'تأیید می‌کنم که مالک قانونی این حساب در آکادمی بهرام رستمی هستم و اطلاعات ارائه‌شده واقعی و متعلق به شخص من است.',
        ],
    ],

    'withdrawal' => [
        'min_balance_for_verification' => (int) env('WITHDRAWAL_MIN_BALANCE_FOR_VERIFICATION', 100_000),
        'verification_fee' => (int) env('WITHDRAWAL_VERIFICATION_FEE', 7_000),
    ],

];
