<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Cache\SyncCache;
use TelegramHost\Support\TelegramCustomEmoji;

final class IranOfflineUserMessage
{
    public function __construct(private readonly SyncCache $cache) {}

    public function text(): string
    {
        return $this->cache->message(
            'iran_server_unreachable',
            TelegramCustomEmoji::tag('warning').' اتصال به سرور اصلی برقرار نشد.'
            ."\n\nلطفاً حدود یک ساعت دیگر دوباره تلاش کنید."
            ."\nمنو و اطلاعات ذخیره‌شده روی همین ربات همچنان در دسترس است.",
        );
    }
}
