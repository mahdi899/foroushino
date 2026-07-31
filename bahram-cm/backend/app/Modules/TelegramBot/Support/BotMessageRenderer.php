<?php

namespace App\Modules\TelegramBot\Support;

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\BotMessageCatalog;

/** Renders synced bot message templates with `{placeholder}` substitution. */
final class BotMessageRenderer
{
    public function __construct(
        private readonly BotMessageCatalog $catalog,
    ) {}

    /**
     * @param  array<string, scalar|null>  $vars
     */
    public function render(?TelegramBot $bot, string $key, array $vars, ?string $fallback = null): string
    {
        $template = $bot !== null
            ? $this->catalog->get($bot, $key)
            : (BotMessageCatalog::defaults()[$key]['body'] ?? '');

        if ($template === '' && $fallback !== null) {
            $template = $fallback;
        }

        return $this->substitute($template, $vars);
    }

    /**
     * @param  array<string, scalar|null>  $vars
     */
    public function renderDefault(string $key, array $vars): string
    {
        $template = BotMessageCatalog::defaults()[$key]['body'] ?? '';

        return $this->substitute($template, $vars);
    }

    /**
     * @param  array<string, scalar|null>  $vars
     */
    private function substitute(string $template, array $vars): string
    {
        if ($template === '' || $vars === []) {
            return $template;
        }

        $pairs = [];
        foreach ($vars as $name => $value) {
            if (! is_string($name) || $name === '') {
                continue;
            }
            $pairs['{'.$name.'}'] = (string) ($value ?? '');
        }

        return strtr($template, $pairs);
    }
}
