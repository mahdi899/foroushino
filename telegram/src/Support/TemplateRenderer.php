<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/** Substitutes `{key}` placeholders in synced bot message templates. */
final class TemplateRenderer
{
    /**
     * @param  array<string, scalar|null>  $vars
     */
    public static function render(string $template, array $vars): string
    {
        if ($template === '' || $vars === []) {
            return $template;
        }

        $pairs = [];
        foreach ($vars as $key => $value) {
            if (! is_string($key) || $key === '') {
                continue;
            }
            $pairs['{'.$key.'}'] = (string) ($value ?? '');
        }

        return strtr($template, $pairs);
    }
}
