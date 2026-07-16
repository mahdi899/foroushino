<?php

return [
    App\Providers\AppServiceProvider::class,
    // Horizon needs ext-pcntl/ext-posix (Linux only) — skip on Windows dev.
    ...(PHP_OS_FAMILY === 'Windows' ? [] : [App\Providers\HorizonServiceProvider::class]),
    App\Modules\TelegramBot\TelegramBotServiceProvider::class,
];
