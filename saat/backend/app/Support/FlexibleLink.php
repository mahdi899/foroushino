<?php

namespace App\Support;

class FlexibleLink
{
  /**
   * Accepts absolute URLs or site-relative paths (e.g. /courses/foo).
   *
   * @return array<int, string>
   */
  public static function rules(): array
  {
    return ['nullable', 'string', 'max:500', function (string $attribute, mixed $value, \Closure $fail): void {
      if ($value === null || $value === '') {
        return;
      }

      $text = trim((string) $value);

      if (preg_match('#^https?://#i', $text)) {
        if (filter_var($text, FILTER_VALIDATE_URL) === false) {
          $fail('آدرس وارد شده معتبر نیست.');
        }

        return;
      }

      if (! preg_match('#^/[A-Za-z0-9_\-./?=&%+#]*$#', $text)) {
        $fail('لینک باید با http(s):// یا / شروع شود.');
      }
    }];
  }

  /**
   * @param  array<string, mixed>  $settings
   */
  public static function toAbsolute(string $url, array $settings = []): string
  {
    $url = trim($url);
    if ($url === '') {
      return '';
    }

    if (preg_match('#^https?://#i', $url)) {
      return rtrim($url, '/');
    }

    if (! str_starts_with($url, '/')) {
      return $url;
    }

    $origin = self::siteOrigin($settings);
    if ($origin === '') {
      return $url;
    }

    return $origin.$url;
  }

  /**
   * @param  array<string, mixed>  $settings
   */
  public static function siteOrigin(array $settings): string
  {
    $sample = trim((string) ($settings['meli_sms_link_course'] ?? config('app.url', '')));
    if ($sample === '') {
      return '';
    }

    $parts = parse_url($sample);
    if (! is_array($parts) || ! isset($parts['scheme'], $parts['host'])) {
      return '';
    }

    $port = isset($parts['port']) ? ':'.$parts['port'] : '';

    return $parts['scheme'].'://'.$parts['host'].$port;
  }
}
