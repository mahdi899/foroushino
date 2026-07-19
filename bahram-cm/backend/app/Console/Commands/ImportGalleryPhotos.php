<?php

namespace App\Console\Commands;

use App\Models\Media;
use App\Support\DirectoryListingGuard;
use App\Support\LegacyMediaMap;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ImportGalleryPhotos extends Command
{
    protected $signature = 'media:import-gallery {--gallery= : Path to gallery root}';

    protected $description = 'Import curated gallery folders into site media library';

    public function handle(): int
    {
        $gallery = $this->option('gallery') ?: dirname(base_path(), 2).'/gallery';

        if (! is_dir($gallery)) {
            $this->error("Gallery directory not found: {$gallery}");

            return self::FAILURE;
        }

        $repoRoot = dirname(base_path(), 2);
        $siteDir = storage_path('app/public/media/site');
        File::ensureDirectoryExists($siteDir);
        DirectoryListingGuard::guardPublicRelativePath('media/site');

        /** @var list<array{source: string, filename: string, legacy: string, alt: string, label: string}> */
        $map = [
            [
                'source' => 'P-Cards/Campaign-Card.webp',
                'filename' => 'main-path-campaign.webp',
                'legacy' => '/media/site-photos/main-path-campaign.webp',
                'label' => 'کارت مسیر کمپین‌نویسی',
                'alt' => 'کارت مسیر کمپین‌نویسی — کمپین‌های ماندگار برای برندها و افراد',
            ],
            [
                'source' => 'P-Cards/Saat-Card.webp',
                'filename' => 'main-path-saat.webp',
                'legacy' => '/media/site-photos/main-path-saat.webp',
                'label' => 'کارت مسیر سات',
                'alt' => 'کارت مسیر سات — سیستم عملیاتی فروش و پل بین آموزش و اجرا',
            ],
            [
                'source' => 'Bahram-Poertre/Portre.webp',
                'filename' => 'portrait-founder.webp',
                'legacy' => '/media/site-photos/portrait-founder.jpg',
                'label' => 'پرتره بهرام رستمی',
                'alt' => 'بهرام رستمی — بنیان‌گذار آکادمی کمپین‌نویسی',
            ],
            [
                'source' => 'Campaign-Discription/Campaign-Discription.webp',
                'filename' => 'manifesto-landscape.webp',
                'legacy' => '/media/site-photos/manifesto-landscape.jpg',
                'label' => 'فضای کار کمپین‌نویسی',
                'alt' => 'فضای کار کمپین‌نویسی — طراحی پیام و کمپین فروش',
            ],
            [
                'source' => 'After-Course/ChatGPT Image Jul 7, 2026, 10_57_41 PM_result.webp',
                'filename' => 'academy-story.webp',
                'legacy' => '/media/site-photos/academy-story.jpg',
                'label' => 'خروجی یادگیری دوره',
                'alt' => 'خروجی یادگیری کمپین‌نویسی — مهارت‌های بعد از دوره',
            ],
            [
                'source' => 'Course/ChatGPT Image Jul 7, 2026, 11_48_04 PM_result.webp',
                'filename' => 'square-backstage.webp',
                'legacy' => '/media/site-photos/square-backstage.jpg',
                'label' => 'کمپین واقعی',
                'alt' => 'پشت صحنه طراحی کمپین واقعی — اجرای مسیر فروش',
            ],
            [
                'source' => 'Steps/001_result.webp',
                'filename' => 'story-step-01.webp',
                'legacy' => '/media/site-photos/story-step-01.jpg',
                'label' => 'مسیر یادگیری — مرحله ۱',
                'alt' => 'مرحله ۱ مسیر یادگیری — شناخت کمپین',
            ],
            [
                'source' => 'Steps/002_result.webp',
                'filename' => 'story-step-02.webp',
                'legacy' => '/media/site-photos/story-step-02.jpg',
                'label' => 'مسیر یادگیری — مرحله ۲',
                'alt' => 'مرحله ۲ مسیر یادگیری — شناخت مخاطب',
            ],
            [
                'source' => 'Steps/003_result.webp',
                'filename' => 'story-step-03.webp',
                'legacy' => '/media/site-photos/story-step-03.jpg',
                'label' => 'مسیر یادگیری — مرحله ۳',
                'alt' => 'مرحله ۳ مسیر یادگیری — طراحی پیام فروش',
            ],
            [
                'source' => 'Steps/004_result.webp',
                'filename' => 'story-step-04.webp',
                'legacy' => '/media/site-photos/story-step-04.jpg',
                'label' => 'مسیر یادگیری — مرحله ۴',
                'alt' => 'مرحله ۴ مسیر یادگیری — نوشتن متن تبلیغاتی',
            ],
            [
                'source' => 'Steps/005_result.webp',
                'filename' => 'story-step-05.webp',
                'legacy' => '/media/site-photos/story-step-05.webp',
                'label' => 'مسیر یادگیری — مرحله ۵',
                'alt' => 'مرحله ۵ مسیر یادگیری — ساخت پیشنهاد فروش',
            ],
            [
                'source' => 'Comments/ChatGPT Image Jul 7, 2026, 09_45_01 PM (1)_result.webp',
                'filename' => 'testimonial-01.webp',
                'legacy' => '/media/site-photos/testimonial-01.jpg',
                'label' => 'نظر دانشجو — سارا ر.',
                'alt' => 'پرتره سارا ر. — مشاور کسب‌وکار و دانشجوی کمپین‌نویسی',
            ],
            [
                'source' => 'Comments/ChatGPT Image Jul 7, 2026, 09_45_02 PM (2)_result.webp',
                'filename' => 'testimonial-02.webp',
                'legacy' => '/media/site-photos/testimonial-02.jpg',
                'label' => 'نظر دانشجو — امیر ه.',
                'alt' => 'پرتره امیر ه. — طراح تجربه و دانشجوی کمپین‌نویسی',
            ],
            [
                'source' => 'Comments/ChatGPT Image Jul 7, 2026, 09_45_03 PM (3)_result.webp',
                'filename' => 'testimonial-03.webp',
                'legacy' => '/media/site-photos/testimonial-03.jpg',
                'label' => 'نظر دانشجو — نازنین ک.',
                'alt' => 'پرتره نازنین ک. — مربی تغذیه و دانشجوی کمپین‌نویسی',
            ],
            [
                'source' => 'Comments/ChatGPT Image Jul 7, 2026, 09_45_03 PM (4)_result.webp',
                'filename' => 'testimonial-04.webp',
                'legacy' => '/media/site-photos/testimonial-04.webp',
                'label' => 'نظر دانشجو — رضا م.',
                'alt' => 'پرتره رضا م. — کارآفرین و دانشجوی کمپین‌نویسی',
            ],
            // Keep course-backstage in sync with campaign card for other pages
            [
                'source' => 'P-Cards/Campaign-Card.webp',
                'filename' => 'course-backstage.webp',
                'legacy' => '/media/site-photos/course-backstage.jpg',
                'label' => 'پشت صحنه دوره کمپین‌نویسی',
                'alt' => 'پشت صحنه دوره کمپین‌نویسی — طراحی کمپین و پیام فروش',
            ],
            [
                'source' => 'P-Cards/Saat-Card.webp',
                'filename' => 'landscape-session.webp',
                'legacy' => '/media/site-photos/landscape-session.jpg',
                'label' => 'نشست فروش سات',
                'alt' => 'نشست فروش و تماس تلفنی — سیستم عملیاتی سات',
            ],
        ];

        $imported = 0;
        foreach ($map as $item) {
            $sourcePath = $gallery.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $item['source']);
            if (! is_file($sourcePath)) {
                $this->warn("Skip missing: {$item['source']}");
                continue;
            }

            $storagePath = 'media/site/'.$item['filename'];
            $dest = storage_path('app/public/'.$storagePath);
            File::copy($sourcePath, $dest);
            DirectoryListingGuard::guardPublicRelativePath($storagePath);

            Media::query()->updateOrCreate(
                ['legacy_path' => $item['legacy']],
                [
                    'disk' => 'public',
                    'path' => $storagePath,
                    'url' => '/storage/'.$storagePath,
                    'type' => 'image',
                    'mime' => 'image/webp',
                    'size' => filesize($dest),
                    'alt_fa' => $item['alt'],
                    'original_filename' => $item['filename'],
                    'category' => 'عکس‌های سایت',
                    'is_private' => false,
                ],
            );

            $imported++;
            $this->line("Imported {$item['filename']}");
        }

        LegacyMediaMap::flush();
        $this->cleanupDuplicateLegacyRows();
        $this->call('media:export-legacy-map');
        $this->info("Imported {$imported} gallery photos.");

        return self::SUCCESS;
    }

    private function cleanupDuplicateLegacyRows(): void
    {
        $rows = Media::query()
            ->where('legacy_path', 'like', '/media/site-photos/%.webp')
            ->get(['id', 'legacy_path', 'path']);

        foreach ($rows as $row) {
            $jpgLegacy = preg_replace('/\.webp$/', '.jpg', (string) $row->legacy_path);
            $jpgRow = Media::query()->where('legacy_path', $jpgLegacy)->first();
            if ($jpgRow && $jpgRow->path === $row->path) {
                $row->delete();
            }
        }
    }
}
