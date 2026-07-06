import { siteConfig } from '@/config/site';

export interface RobotsTxtConfig {
  body: string;
  sitemap: string;
  is_custom: boolean;
}

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/+$/, '');
}

export function defaultRobotsTxtBody(baseUrl = siteBaseUrl()): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join('\n');
}
