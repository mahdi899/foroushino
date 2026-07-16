<?php

return [

    'display_name' => 'خانواده داداش بهرام',

    'capacity' => [
        'target' => (int) env('FAMILY_CAPACITY_TARGET', 5000),
        'min' => (int) env('FAMILY_CAPACITY_MIN', 4500),
        'max' => (int) env('FAMILY_CAPACITY_MAX', 5200),
    ],

    'assignment_weights' => [
        'source_match' => (float) env('FAMILY_WEIGHT_SOURCE', 0.35),
        'entry_event' => (float) env('FAMILY_WEIGHT_ENTRY_EVENT', 0.30),
        'capacity_balance' => (float) env('FAMILY_WEIGHT_CAPACITY', 0.20),
        'family_diversity' => (float) env('FAMILY_WEIGHT_DIVERSITY', 0.15),
    ],

    'assignment_lock_seconds' => (int) env('FAMILY_ASSIGNMENT_LOCK_SECONDS', 10),

    'entry' => [
        'base_url' => rtrim((string) env('FAMILY_ENTRY_BASE_URL', env('FRONTEND_URL', 'http://localhost:3000')), '/'),
        'path' => trim((string) env('FAMILY_ENTRY_PATH', 'family'), '/'),
    ],

    'internal_name_pool' => [
        'سپهر', 'آبان', 'مسیر', 'رشد', 'فردا', 'رویش',
        'امید', 'طلوع', 'نسیم', 'آرامش', 'همراه', 'گام',
    ],

    'media' => [
        'ftp' => [
            'host' => env('FAMILY_MEDIA_FTP_HOST'),
            'port' => (int) env('FAMILY_MEDIA_FTP_PORT', 21),
            'username' => env('FAMILY_MEDIA_FTP_USERNAME'),
            'password' => env('FAMILY_MEDIA_FTP_PASSWORD'),
            'root' => env('FAMILY_MEDIA_FTP_ROOT', '/'),
            'passive' => filter_var(env('FAMILY_MEDIA_FTP_PASSIVE', true), FILTER_VALIDATE_BOOL),
            'timeout' => (int) env('FAMILY_MEDIA_FTP_TIMEOUT', 60),
        ],
        'cdn_url' => rtrim((string) env('FAMILY_MEDIA_CDN_URL', ''), '/'),
        // Local dev without FTP credentials defaults to public disk (media/family/…).
        'disk' => env('FAMILY_MEDIA_DISK') ?: (env('FAMILY_MEDIA_FTP_HOST') ? 'family_media_ftp' : 'public'),
        'optimize_images' => filter_var(env('FAMILY_OPTIMIZE_IMAGES', true), FILTER_VALIDATE_BOOL),
        'sync_to_site_library' => filter_var(env('FAMILY_SYNC_TO_SITE_MEDIA', true), FILTER_VALIDATE_BOOL),
        'ftp_upload_enabled' => filter_var(env('FAMILY_FTP_UPLOAD_ENABLED', true), FILTER_VALIDATE_BOOL),
        'temp_disk' => env('FAMILY_MEDIA_TEMP_DISK', 'local'),
        'temp_path' => 'family-ingest',
        'max_voice_mb' => (int) env('FAMILY_MEDIA_MAX_VOICE_MB', 50),
        'max_video_mb' => (int) env('FAMILY_MEDIA_MAX_VIDEO_MB', 500),
        'max_image_mb' => (int) env('FAMILY_MEDIA_MAX_IMAGE_MB', 15),
        'chunk_size_mb' => (int) env('FAMILY_MEDIA_CHUNK_SIZE_MB', 5),
        'ffmpeg_bin' => env('FAMILY_FFMPEG_BIN', 'ffmpeg'),
        'ffprobe_bin' => env('FAMILY_FFPROBE_BIN', 'ffprobe'),
    ],

    'rate_limits' => [
        'comment_per_minute' => (int) env('FAMILY_RATE_COMMENT', 5),
        'reaction_per_minute' => (int) env('FAMILY_RATE_REACTION', 30),
        'action_per_minute' => (int) env('FAMILY_RATE_ACTION', 10),
        'progress_per_minute' => (int) env('FAMILY_RATE_PROGRESS', 60),
        'upload_per_hour' => (int) env('FAMILY_RATE_UPLOAD', 40),
    ],

    'comment' => [
        'max_length' => 1000,
        'short_text_max_length' => 200,
        'require_approval' => filter_var(env('FAMILY_COMMENT_REQUIRE_APPROVAL', false), FILTER_VALIDATE_BOOL),
    ],

    'feed' => [
        'per_page' => 15,
        'guest_preview_posts' => (int) env('FAMILY_GUEST_PREVIEW_POSTS', 4),
        'guest_preview_partial' => true,
    ],

    'cache' => [
        'branding_ttl' => (int) env('FAMILY_CACHE_BRANDING_TTL', 300),
        'stories_flag_ttl' => (int) env('FAMILY_CACHE_STORIES_FLAG_TTL', 60),
        'guest_feed_ttl' => (int) env('FAMILY_CACHE_GUEST_FEED_TTL', 30),
        'pulse_ttl' => (int) env('FAMILY_CACHE_PULSE_TTL', 60),
        'member_count_ttl' => (int) env('FAMILY_CACHE_MEMBER_COUNT_TTL', 300),
        'action_stats_ttl' => (int) env('FAMILY_CACHE_ACTION_STATS_TTL', 60),
        // Member feed tip page (cursor=null) — the hottest query per family. Short TTL
        // because it's also bumped by a version key on every publish (see
        // FamilyPostPublisher::publish), so this mostly protects against read bursts.
        'feed_tip_ttl' => (int) env('FAMILY_CACHE_FEED_TIP_TTL', 8),
    ],

    'onboarding' => [
        'title' => 'خوش اومدی {name}.',
        'body' => "اینجا فقط قرار نیست محتوا ببینی.\n\nحرف‌هایی رو اینجا می‌گم که شاید جای دیگه نگم.\n\nخانواده‌ای.\n\nپس فقط تماشاچی نباش.\n\n— بهرام",
        'cta' => 'وارد خانواده شو',
    ],

    'queues' => [
        'high' => 'family-high',
        'media' => 'family-media',
        'analytics' => 'family-analytics',
        'ai' => 'family-ai',
        'notifications' => 'family-notifications',
        'low' => 'family-low',
    ],

];
