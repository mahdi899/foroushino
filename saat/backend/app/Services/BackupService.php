<?php

namespace App\Services;

use App\Models\DatabaseBackupSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

class BackupService
{
    /** @return array<string, mixed> */
    public function adminView(): array
    {
        $settings = DatabaseBackupSetting::current();

        return [
            'is_auto_enabled' => (bool) $settings->is_auto_enabled,
            'is_weekly_auto_enabled' => (bool) ($settings->is_weekly_auto_enabled ?? true),
            'schedule_time' => $settings->schedule_time ?? '04:00',
            'weekly_schedule_weekday' => (int) ($settings->weekly_schedule_weekday ?? 0),
            'retention_count' => (int) ($settings->retention_count ?? 30),
            'daily_retention_days' => $this->dailyRetentionDays(),
            'weekly_retention_days' => $this->weeklyRetentionDays(),
            'last_backup_at' => $settings->last_backup_at?->toIso8601String(),
            'last_backup_status' => $settings->last_backup_status,
            'last_backup_message' => $settings->last_backup_message,
            'last_backup_size_bytes' => $settings->last_backup_size_bytes,
            'last_weekly_backup_at' => $settings->last_weekly_backup_at?->toIso8601String(),
            'last_weekly_backup_status' => $settings->last_weekly_backup_status,
            'last_weekly_backup_message' => $settings->last_weekly_backup_message,
            'last_weekly_backup_size_bytes' => $settings->last_weekly_backup_size_bytes,
            'mysqldump_available' => $this->mysqldumpBinary() !== null,
            'database_name' => $this->databaseName(),
            'storage_app_exists' => is_dir(storage_path('app')),
            'daily_backup_dir' => $this->dailyBackupDirectory(),
            'weekly_backup_dir' => $this->weeklyBackupDirectory(),
        ];
    }

    /** @param  array<string, mixed>  $input */
    public function update(array $input): array
    {
        $settings = DatabaseBackupSetting::current();
        $patch = [];

        if (array_key_exists('is_auto_enabled', $input)) {
            $patch['is_auto_enabled'] = (bool) $input['is_auto_enabled'];
        }

        if (array_key_exists('is_weekly_auto_enabled', $input)) {
            $patch['is_weekly_auto_enabled'] = (bool) $input['is_weekly_auto_enabled'];
        }

        if (array_key_exists('schedule_time', $input)) {
            $time = trim((string) $input['schedule_time']);
            if (! preg_match('/^\d{2}:\d{2}$/', $time)) {
                throw new RuntimeException('زمان اجرای بکاپ نامعتبر است.');
            }
            $patch['schedule_time'] = $time;
        }

        if (array_key_exists('weekly_schedule_weekday', $input)) {
            $weekday = (int) $input['weekly_schedule_weekday'];
            if ($weekday < 0 || $weekday > 6) {
                throw new RuntimeException('روز هفته برای بکاپ هفتگی نامعتبر است.');
            }
            $patch['weekly_schedule_weekday'] = $weekday;
        }

        if (array_key_exists('retention_count', $input)) {
            $patch['retention_count'] = max(1, min(30, (int) $input['retention_count']));
        }

        if ($patch !== []) {
            $settings->update($patch);
        }

        return $this->adminView();
    }

    /** @return array{ok: bool, message: string, path?: string, filename?: string, size_bytes?: int} */
    public function runBackup(): array
    {
        $settings = DatabaseBackupSetting::current();

        try {
            $artifact = $this->createDumpArtifact();

            $settings->update([
                'last_backup_at' => now(),
                'last_backup_status' => 'success',
                'last_backup_message' => 'بکاپ دیتابیس با موفقیت ساخته شد.',
                'last_backup_size_bytes' => $artifact['size_bytes'],
            ]);

            return [
                'ok' => true,
                'message' => 'بکاپ دیتابیس با موفقیت ساخته شد.',
                'path' => $artifact['path'],
                'filename' => $artifact['filename'],
                'size_bytes' => $artifact['size_bytes'],
            ];
        } catch (Throwable $e) {
            Log::error('Saat database backup failed.', ['message' => $e->getMessage()]);

            $settings->update([
                'last_backup_at' => now(),
                'last_backup_status' => 'failed',
                'last_backup_message' => $e->getMessage(),
                'last_backup_size_bytes' => null,
            ]);

            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    public function shouldRunScheduled(): bool
    {
        $settings = DatabaseBackupSetting::current();

        if (! $settings->is_auto_enabled) {
            return false;
        }

        $scheduled = $settings->schedule_time ?? '04:00';
        if (now()->format('H:i') !== $scheduled) {
            return false;
        }

        return ! ($settings->last_backup_at && $settings->last_backup_at->isToday());
    }

    /** @return array{ok: bool, message: string} */
    public function runScheduled(): array
    {
        if (! $this->shouldRunScheduled()) {
            return ['ok' => true, 'message' => 'زمان اجرای بکاپ فرا نرسیده است.'];
        }

        $result = $this->runBackup();

        return ['ok' => $result['ok'], 'message' => $result['message']];
    }

    public function shouldRunWeeklyScheduled(): bool
    {
        $settings = DatabaseBackupSetting::current();

        if (! ($settings->is_weekly_auto_enabled ?? true)) {
            return false;
        }

        $weekday = (string) ($settings->weekly_schedule_weekday ?? 0);
        if (now()->format('w') !== $weekday) {
            return false;
        }

        return ! ($settings->last_weekly_backup_at && $settings->last_weekly_backup_at->isToday());
    }

    /** @return array{ok: bool, message: string, path?: string, size_bytes?: int} */
    public function runWeeklyFullBackup(): array
    {
        $settings = DatabaseBackupSetting::current();

        try {
            $dateFolder = now()->format('Y-m-d');
            $dir = $this->weeklyBackupDirectory().DIRECTORY_SEPARATOR.$dateFolder;
            File::ensureDirectoryExists($dir);

            $dbArtifact = $this->createDumpInDirectory($dir, 'database.sql.gz');
            $storageArtifact = $this->createStorageZipInDirectory($dir);

            $manifest = [
                'type' => 'weekly_full',
                'created_at' => now()->toIso8601String(),
                'database' => $dbArtifact['filename'],
                'storage' => $storageArtifact['filename'],
                'size_bytes' => $dbArtifact['size_bytes'] + $storageArtifact['size_bytes'],
            ];
            file_put_contents(
                $dir.DIRECTORY_SEPARATOR.'manifest.json',
                json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            );

            $this->pruneWeeklyBackups();

            $settings->update([
                'last_weekly_backup_at' => now(),
                'last_weekly_backup_status' => 'success',
                'last_weekly_backup_message' => 'بکاپ کامل هفتگی (دیتابیس + فایل‌ها) ساخته شد.',
                'last_weekly_backup_size_bytes' => $manifest['size_bytes'],
            ]);

            return [
                'ok' => true,
                'message' => 'بکاپ کامل هفتگی با موفقیت ساخته شد.',
                'path' => $dir,
                'size_bytes' => $manifest['size_bytes'],
            ];
        } catch (Throwable $e) {
            Log::error('Saat weekly full backup failed.', ['message' => $e->getMessage()]);

            $settings->update([
                'last_weekly_backup_at' => now(),
                'last_weekly_backup_status' => 'failed',
                'last_weekly_backup_message' => $e->getMessage(),
                'last_weekly_backup_size_bytes' => null,
            ]);

            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    /** @return array{ok: bool, message: string} */
    public function runWeeklyScheduled(): array
    {
        if (! $this->shouldRunWeeklyScheduled()) {
            return ['ok' => true, 'message' => 'زمان بکاپ هفتگی فرا نرسیده است.'];
        }

        $result = $this->runWeeklyFullBackup();

        return ['ok' => $result['ok'], 'message' => $result['message']];
    }

    /** @return array{path: string, filename: string, size_bytes: int} */
    public function createDumpArtifact(): array
    {
        $this->ensureMysql();

        $dir = $this->dailyBackupDirectory();
        File::ensureDirectoryExists($dir);

        $timestamp = now()->format('Y-m-d_His');
        $filename = 'backup_'.$this->databaseName().'_'.$timestamp.'.sql.gz';

        $artifact = $this->createDumpInDirectory($dir, $filename);
        $this->pruneDailyBackups();

        return $artifact;
    }

    /** @return array{path: string, filename: string, size_bytes: int} */
    private function createDumpInDirectory(string $directory, string $filename): array
    {
        $binary = $this->mysqldumpBinary();
        if ($binary === null) {
            throw new RuntimeException('ابزار mysqldump یافت نشد. MYSQLDUMP_PATH را در env تنظیم کنید.');
        }

        $config = $this->mysqlConfig();
        $gzPath = $directory.DIRECTORY_SEPARATOR.$filename;
        $sqlPath = str_ends_with($filename, '.gz')
            ? $directory.DIRECTORY_SEPARATOR.str_replace('.sql.gz', '.sql', $filename)
            : $directory.DIRECTORY_SEPARATOR.$filename.'.sql';

        $command = [
            $binary,
            '--host='.$config['host'],
            '--port='.(string) $config['port'],
            '--user='.$config['username'],
            '--single-transaction',
            '--routines',
            '--triggers',
            '--result-file='.$sqlPath,
            $config['database'],
        ];

        $env = array_filter([
            'MYSQL_PWD' => $config['password'] !== '' ? $config['password'] : null,
        ]);

        $process = new Process($command, null, $env, null, 300);
        $process->run();

        if (! $process->isSuccessful() || ! is_file($sqlPath)) {
            throw new RuntimeException('ساخت dump ناموفق بود: '.trim($process->getErrorOutput() ?: $process->getOutput()));
        }

        $sql = file_get_contents($sqlPath);
        if ($sql === false) {
            throw new RuntimeException('خواندن فایل dump ناموفق بود.');
        }

        $gz = gzencode($sql, 9);
        if ($gz === false) {
            @unlink($sqlPath);

            throw new RuntimeException('فشرده‌سازی dump ناموفق بود.');
        }

        file_put_contents($gzPath, $gz);
        @unlink($sqlPath);

        return [
            'path' => $gzPath,
            'filename' => basename($gzPath),
            'size_bytes' => filesize($gzPath) ?: 0,
        ];
    }

    /** @return array{path: string, filename: string, size_bytes: int} */
    public function createStorageArtifact(): array
    {
        $dir = $this->dailyBackupDirectory();
        File::ensureDirectoryExists($dir);

        $timestamp = now()->format('Y-m-d_His');
        $artifact = $this->createStorageZipInDirectory($dir, 'storage_app_'.$timestamp.'.zip');
        $this->pruneDailyBackups();

        return $artifact;
    }

    /** @return array{path: string, filename: string, size_bytes: int} */
    private function createStorageZipInDirectory(string $directory, ?string $filename = null): array
    {
        $source = storage_path('app');
        if (! is_dir($source)) {
            throw new RuntimeException('پوشه storage/app یافت نشد.');
        }

        $filename ??= 'storage_app_'.now()->format('Y-m-d_His').'.zip';
        $zipPath = $directory.DIRECTORY_SEPARATOR.$filename;

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('ساخت فایل ZIP ناموفق بود.');
        }

        $sourceReal = realpath($source);
        if ($sourceReal === false) {
            $zip->close();
            @unlink($zipPath);

            throw new RuntimeException('مسیر storage/app نامعتبر است.');
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourceReal, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($iterator as $file) {
            /** @var \SplFileInfo $file */
            $path = $file->getPathname();
            $relative = substr($path, strlen($sourceReal) + 1);

            if (str_starts_with(str_replace('\\', '/', $relative), 'backups/')) {
                continue;
            }

            if ($file->isDir()) {
                $zip->addEmptyDir(str_replace('\\', '/', $relative));
            } else {
                $zip->addFile($path, str_replace('\\', '/', $relative));
            }
        }

        $zip->close();

        if (! is_file($zipPath)) {
            throw new RuntimeException('فایل ZIP ساخته نشد.');
        }

        return [
            'path' => $zipPath,
            'filename' => basename($zipPath),
            'size_bytes' => filesize($zipPath) ?: 0,
        ];
    }

    public function restoreUploadedFile(UploadedFile $file): void
    {
        $this->ensureMysql();

        $binary = $this->mysqlBinary();
        if ($binary === null) {
            throw new RuntimeException('ابزار mysql یافت نشد. MYSQL_PATH را در env تنظیم کنید.');
        }

        $sql = $this->readSqlPayload($file);
        if ($sql === '') {
            throw new RuntimeException('فایل بکاپ خالی است.');
        }

        $config = $this->mysqlConfig();
        $command = [
            $binary,
            '--host='.$config['host'],
            '--port='.(string) $config['port'],
            '--user='.$config['username'],
            $config['database'],
        ];

        $env = array_filter([
            'MYSQL_PWD' => $config['password'] !== '' ? $config['password'] : null,
        ]);

        $process = new Process($command, null, $env, null, 600);
        $process->setInput($sql);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('بازیابی دیتابیس ناموفق بود: '.trim($process->getErrorOutput() ?: $process->getOutput()));
        }
    }

    public function pruneLocalBackups(?int $retentionCount = null): void
    {
        $this->pruneDailyBackups();
        $this->pruneWeeklyBackups();
    }

    public function pruneDailyBackups(?int $retentionDays = null): void
    {
        $days = max(1, $retentionDays ?? $this->dailyRetentionDays());
        $this->pruneDirectoryByAge($this->dailyBackupDirectory(), $days);
        $this->pruneLegacyRootBackups($days);
    }

    public function pruneWeeklyBackups(?int $retentionDays = null): void
    {
        $days = max(1, $retentionDays ?? $this->weeklyRetentionDays());
        $weeklyDir = $this->weeklyBackupDirectory();
        if (! is_dir($weeklyDir)) {
            return;
        }

        $cutoff = now()->subDays($days)->startOfDay()->getTimestamp();

        foreach (File::directories($weeklyDir) as $directory) {
            $name = basename($directory);
            $folderTime = strtotime($name.' 00:00:00');
            if ($folderTime !== false && $folderTime < $cutoff) {
                File::deleteDirectory($directory);
            }
        }
    }

    private function pruneLegacyRootBackups(int $days): void
    {
        $root = $this->backupDirectory();
        if (! is_dir($root)) {
            return;
        }

        $cutoff = now()->subDays($days)->getTimestamp();
        foreach (File::files($root) as $file) {
            if ($file->getMTime() < $cutoff) {
                @unlink($file->getPathname());
            }
        }
    }

    private function pruneDirectoryByAge(string $directory, int $retentionDays): void
    {
        if (! is_dir($directory)) {
            return;
        }

        $cutoff = now()->subDays($retentionDays)->getTimestamp();
        foreach (File::files($directory) as $file) {
            if ($file->getMTime() < $cutoff) {
                @unlink($file->getPathname());
            }
        }
    }

    private function dailyRetentionDays(): int
    {
        return max(1, (int) config('saat.backup.daily_retention_days', 30));
    }

    private function weeklyRetentionDays(): int
    {
        return max(1, (int) config('saat.backup.weekly_retention_days', 90));
    }

    private function dailyBackupDirectory(): string
    {
        return $this->backupDirectory().'/daily';
    }

    private function weeklyBackupDirectory(): string
    {
        return $this->backupDirectory().'/weekly';
    }

    private function backupDirectory(): string
    {
        return storage_path('app/backups');
    }

    private function readSqlPayload(UploadedFile $file): string
    {
        $path = $file->getRealPath();
        if ($path === false) {
            throw new RuntimeException('فایل آپلود نامعتبر است.');
        }

        $name = strtolower($file->getClientOriginalName());
        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new RuntimeException('خواندن فایل آپلود ناموفق بود.');
        }

        if (str_ends_with($name, '.gz')) {
            $decoded = gzdecode($raw);

            return $decoded === false ? '' : $decoded;
        }

        return $raw;
    }

    private function ensureMysql(): void
    {
        if (config('database.connections.'.config('database.default').'.driver') !== 'mysql') {
            throw new RuntimeException('فعلاً فقط بکاپ MySQL پشتیبانی می‌شود.');
        }
    }

    /** @return array{host: string, port: int|string, database: string, username: string, password: string} */
    private function mysqlConfig(): array
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        return [
            'host' => (string) ($config['host'] ?? '127.0.0.1'),
            'port' => $config['port'] ?? 3306,
            'database' => (string) ($config['database'] ?? ''),
            'username' => (string) ($config['username'] ?? ''),
            'password' => (string) ($config['password'] ?? ''),
        ];
    }

    private function databaseName(): string
    {
        return $this->mysqlConfig()['database'];
    }

    private function mysqldumpBinary(): ?string
    {
        return $this->resolveMysqlTool(
            configured: trim((string) config('saat.backup.mysqldump_path', '')),
            fallbacks: ['mysqldump', 'mysqldump.exe'],
            windowsPaths: $this->discoverWindowsMysqlToolPaths('mysqldump.exe'),
        );
    }

    private function mysqlBinary(): ?string
    {
        return $this->resolveMysqlTool(
            configured: trim((string) config('saat.backup.mysql_path', '')),
            fallbacks: ['mysql', 'mysql.exe'],
            windowsPaths: $this->discoverWindowsMysqlToolPaths('mysql.exe'),
        );
    }

    /** @return list<string> */
    private function discoverWindowsMysqlToolPaths(string $binaryName): array
    {
        $paths = [
            'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\'.$binaryName,
            'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\'.$binaryName,
            'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\'.$binaryName,
            'C:\\xampp\\mysql\\bin\\'.$binaryName,
        ];

        foreach (glob('C:\\laragon\\bin\\mysql\\*\\bin\\'.$binaryName) ?: [] as $laragonPath) {
            $paths[] = $laragonPath;
        }

        return $paths;
    }

    /** @param  list<string>  $fallbacks
     * @param  list<string>  $windowsPaths
     */
    private function resolveMysqlTool(string $configured, array $fallbacks, array $windowsPaths): ?string
    {
        if ($configured !== '' && is_file($configured)) {
            return $configured;
        }

        foreach ($windowsPaths as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        foreach ($fallbacks as $binary) {
            $resolved = $this->which($binary);
            if ($resolved !== null) {
                return $resolved;
            }
        }

        return null;
    }

    private function which(string $binary): ?string
    {
        $process = PHP_OS_FAMILY === 'Windows'
            ? new Process(['where', $binary])
            : new Process(['which', $binary]);

        $process->run();

        if (! $process->isSuccessful()) {
            return null;
        }

        $line = trim(explode("\n", $process->getOutput())[0] ?? '');

        return $line !== '' && is_file($line) ? $line : null;
    }
}
