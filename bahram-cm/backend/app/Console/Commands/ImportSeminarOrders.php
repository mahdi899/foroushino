<?php

namespace App\Console\Commands;

use App\Models\Seminar;
use App\Services\SeminarOrderImportService;
use Illuminate\Console\Command;

class ImportSeminarOrders extends Command
{
    public const DEFAULT_CSV = 'database/data/woocommerce-seminar-orders-2026-07-10.csv';

    public const DEFAULT_SEMINAR_SLUG = 'smynar-zaafranyh-thran';

    protected $signature = 'seminar:import-orders
                            {file? : مسیر فایل CSV خروجی ووکامرس}
                            {--seminar-id= : شناسه سمینار}
                            {--seminar-slug= : اسلاگ سمینار (پیش‌فرض: smynar-zaafranyh-thran)}
                            {--item-name=سمینار 1000 نفره چرخه : فقط ردیف‌های با این نام محصول}
                            {--dry-run : اجرای آزمایشی بدون ذخیره در دیتابیس}
                            {--no-mark-full : ظرفیت سمینار را بعد از import به‌روز نکن}';

    protected $description = 'ایجاد اکانت دانشجو، ثبت‌نام سمینار و سفارش پرداخت‌شده از خروجی CSV ووکامرس';

    public function handle(SeminarOrderImportService $importService): int
    {
        $file = $this->resolveFilePath();
        if (! is_file($file)) {
            $this->error("فایل یافت نشد: {$file}");
            $this->line('ابتدا `git pull` بزنید یا مسیر فایل CSV را دستی بدهید.');

            return self::FAILURE;
        }

        $seminar = $this->resolveSeminar();
        if (! $seminar) {
            $this->error('سمینار هدف پیدا نشد.');
            $this->line('ابتدا `php artisan db:seed` را اجرا کنید تا سمینار ساخته شود.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $markFull = ! $this->option('no-mark-full');
        $itemName = $this->option('item-name');

        $this->info("سمینار: {$seminar->title} (#{$seminar->id})");
        $this->info('فایل: '.$file);
        if ($dryRun) {
            $this->warn('حالت dry-run — هیچ تغییری ذخیره نمی‌شود.');
        }

        $stats = $importService->import(
            filePath: $file,
            seminar: $seminar,
            dryRun: $dryRun,
            markFull: $markFull,
            expectedItemName: is_string($itemName) && $itemName !== '' ? $itemName : null,
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
            if ($stats['capacity_set_to']) {
                $this->info("ظرفیت سمینار روی {$stats['capacity_set_to']} تنظیم شد (ظرفیت پر).");
            }
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

    private function resolveSeminar(): ?Seminar
    {
        $seminarId = $this->option('seminar-id');
        if ($seminarId) {
            return Seminar::query()->find($seminarId);
        }

        $slug = $this->option('seminar-slug') ?: self::DEFAULT_SEMINAR_SLUG;
        $bySlug = Seminar::query()->where('slug', $slug)->first();
        if ($bySlug) {
            return $bySlug;
        }

        $published = Seminar::query()->where('status', 'published')->get();
        if ($published->count() === 1) {
            return $published->first();
        }

        return Seminar::query()->orderByDesc('id')->first();
    }
}
