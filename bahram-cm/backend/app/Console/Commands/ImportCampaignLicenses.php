<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\CampaignLicenseImportService;
use Illuminate\Console\Command;

class ImportCampaignLicenses extends Command
{
    public const DEFAULT_CSV = 'database/data/spotplayer-licenses-2026-07-10.csv';

    public const DEFAULT_PRODUCT_SLUG = 'campaign-writing';

    protected $signature = 'campaign:import-licenses
                            {file? : مسیر فایل CSV خروجی SpotPlayer}
                            {--product-id= : شناسه محصول دوره کمپین‌نویسی}
                            {--product-slug= : اسلاگ محصول (پیش‌فرض: campaign-writing)}
                            {--dry-run : اجرای آزمایشی بدون ذخیره در دیتابیس}';

    protected $description = 'ایجاد اکانت دانشجو، دسترسی دوره کمپین‌نویسی و لایسنس SpotPlayer از خروجی CSV';

    public function handle(CampaignLicenseImportService $importService): int
    {
        $file = $this->resolveFilePath();
        if (! is_file($file)) {
            $this->error("فایل یافت نشد: {$file}");
            $this->line('ابتدا `git pull` بزنید یا مسیر فایل CSV را دستی بدهید.');

            return self::FAILURE;
        }

        $product = $this->resolveProduct();
        if (! $product) {
            $this->error('محصول دوره کمپین‌نویسی پیدا نشد.');
            $this->line('ابتدا `php artisan db:seed` را اجرا کنید تا محصول ساخته شود.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        $this->info("محصول: {$product->title} (#{$product->id})");
        $this->info('فایل: '.$file);
        if ($dryRun) {
            $this->warn('حالت dry-run — هیچ تغییری ذخیره نمی‌شود.');
        }

        $stats = $importService->import(
            filePath: $file,
            product: $product,
            dryRun: $dryRun,
        );

        $this->newLine();
        $this->table(
            ['شاخص', 'تعداد'],
            collect($stats)
                ->map(fn ($value, $key) => [$key, is_scalar($value) ? (string) $value : json_encode($value, JSON_UNESCAPED_UNICODE)])
                ->values()
                ->all(),
        );

        if ($dryRun) {
            $this->warn('dry-run تمام شد. برای import واقعی بدون --dry-run اجرا کنید.');
        } else {
            $this->info('import با موفقیت انجام شد.');
        }

        return self::SUCCESS;
    }

    private function resolveFilePath(): string
    {
        $file = $this->argument('file') ?? self::DEFAULT_CSV;

        if (! str_starts_with($file, DIRECTORY_SEPARATOR) && ! preg_match('/^[A-Za-z]:[\\\\\\/]/', $file)) {
            $file = base_path($file);
        }

        return $file;
    }

    private function resolveProduct(): ?Product
    {
        $productId = $this->option('product-id');
        if ($productId) {
            return Product::query()->find($productId);
        }

        $slug = $this->option('product-slug') ?: self::DEFAULT_PRODUCT_SLUG;

        return Product::query()->where('slug', $slug)->first();
    }
}
