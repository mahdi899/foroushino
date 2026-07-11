<?php

namespace App\Services;

use App\Models\DatabaseBackupSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

class DatabaseBackupService
{
    private const TELEGRAM_MAX_BYTES = 50 * 1024 * 1024;

    /** @return array<string, mixed> */
    public function adminView(): array
    {
        $settings = DatabaseBackupSetting::current();
        $telegram = TelegramBotClient::fromAdminConfig();
        $chatIds = TelegramBotClient::adminChatIds();

        return [
            'is_auto_enabled' => (bool) $settings->is_auto_enabled,
            'schedule_time' => $settings->schedule_time ?? '04:00',
            'send_to_telegram' => (bool) $settings->send_to_telegram,
            'retention_count' => (int) ($settings->retention_count ?? 7),
            'last_backup_at' => $settings->last_backup_at?->toIso8601String(),
            'last_backup_status' => $settings->last_backup_status,
            'last_backup_message' => $settings->last_backup_message,
            'last_backup_size_bytes' => $settings->last_backup_size_bytes,
            'telegram_configured' => $telegram->isConfigured() && $chatIds !== [],
            'telegram_chat_count' => count($chatIds),
            'mysqldump_available' => $this->mysqldumpBinary() !== null,
            'database_name' => $this->databaseName(),
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

        if (array_key_exists('schedule_time', $input)) {
            $time = trim((string) $input['schedule_time']);
            if (! preg_match('/^\d{2}:\d{2}$/', $time)) {
                throw new RuntimeException('زمان اجرای بکاپ نامعتبر است.');
            }
            $patch['schedule_time'] = $time;
        }

        if (array_key_exists('send_to_telegram', $input)) {
            $patch['send_to_telegram'] = (bool) $input['send_to_telegram'];
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
    public function runBackup(bool $sendToTelegram): array
    {
        $settings = DatabaseBackupSetting::current();

        try {
            $artifact = $this->createDumpArtifact();
            $this->cleanupRetention((int) ($settings->retention_count ?? 7));

            $message = 'بکاپ دیتابیس با موفقیت ساخته شد.';
            $status = 'success';

            if ($sendToTelegram) {
                $telegramResult = $this->sendArtifactToTelegram($artifact);
                if (! $telegramResult['ok']) {
                    $status = 'partial';
                    $message = $telegramResult['message'];
                } else {
                    $message = 'بکاپ ساخته و به تلگرام ارسال شد.';
                }
            }

            $settings->update([
                'last_backup_at' => now(),
                'last_backup_status' => $status,
                'last_backup_message' => $message,
                'last_backup_size_bytes' => $artifact['size_bytes'],
            ]);

            return [
                'ok' => true,
                'message' => $message,
                'path' => $artifact['path'],
                'filename' => $artifact['filename'],
                'size_bytes' => $artifact['size_bytes'],
            ];
        } catch (Throwable $e) {
            Log::error('Database backup failed.', ['message' => $e->getMessage()]);

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

        $settings = DatabaseBackupSetting::current();
        $result = $this->runBackup((bool) $settings->send_to_telegram);

        return ['ok' => $result['ok'], 'message' => $result['message']];
    }

    /** @return array{ok: bool, message: string} */
    public function testTelegram(): array
    {
        $telegram = TelegramBotClient::fromAdminConfig();
        $chatIds = TelegramBotClient::adminChatIds();

        if (! $telegram->isConfigured()) {
            return ['ok' => false, 'message' => 'توکن ربات تلگرام در بخش مسیردهی پیامک تنظیم نشده است.'];
        }

        if ($chatIds === []) {
            return ['ok' => false, 'message' => 'شناسه چت تلگرام ادمین در تنظیمات پیامک وارد نشده است.'];
        }

        $sent = 0;
        foreach ($chatIds as $chatId) {
            if ($telegram->sendMessage(
                $chatId,
                '<b>تست بکاپ دیتابیس</b>'."\n".'اتصال ربات تلگرام برای ارسال فایل بکاپ آماده است.',
            )) {
                $sent++;
            }
        }

        if ($sent === 0) {
            return ['ok' => false, 'message' => 'ارسال پیام تست به تلگرام ناموفق بود.'];
        }

        return ['ok' => true, 'message' => "پیام تست به {$sent} چت ارسال شد."];
    }

    /** @return array{path: string, filename: string, size_bytes: int} */
    public function createDumpArtifact(): array
    {
        $this->ensureMysql();

        $binary = $this->mysqldumpBinary();
        if ($binary === null) {
            throw new RuntimeException('ابزار mysqldump یافت نشد. مسیر MYSQLDUMP_PATH را در env تنظیم کنید.');
        }

        $config = $this->mysqlConfig();
        $dir = $this->backupDirectory();
        File::ensureDirectoryExists($dir);

        $timestamp = now()->format('Y-m-d_His');
        $filename = "backup_{$config['database']}_{$timestamp}.sql.gz";
        $gzPath = $dir.DIRECTORY_SEPARATOR.$filename;
        $sqlPath = $dir.DIRECTORY_SEPARATOR."backup_{$config['database']}_{$timestamp}.sql";

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
            'filename' => $filename,
            'size_bytes' => filesize($gzPath) ?: 0,
        ];
    }

    public function restoreUploadedFile(UploadedFile $file): void
    {
        $this->ensureMysql();

        $binary = $this->mysqlBinary();
        if ($binary === null) {
            throw new RuntimeException('ابزار mysql یافت نشد. مسیر MYSQL_PATH را در env تنظیم کنید.');
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

    /** @param  array{path: string, filename: string, size_bytes: int}  $artifact */
    private function sendArtifactToTelegram(array $artifact): array
    {
        $telegram = TelegramBotClient::fromAdminConfig();
        $chatIds = TelegramBotClient::adminChatIds();

        if (! $telegram->isConfigured()) {
            return ['ok' => false, 'message' => 'بکاپ ساخته شد اما توکن ربات تلگرام تنظیم نشده است.'];
        }

        if ($chatIds === []) {
            return ['ok' => false, 'message' => 'بکاپ ساخته شد اما شناسه چت تلگرام ادمین خالی است.'];
        }

        if ($artifact['size_bytes'] > self::TELEGRAM_MAX_BYTES) {
            return [
                'ok' => false,
                'message' => 'بکاپ ساخته شد اما حجم فایل از سقف ۵۰ مگابایت تلگرام بیشتر است.',
            ];
        }

        $caption = 'بکاپ دیتابیس '.config('app.name')."\n".basename($artifact['filename']);
        $sent = 0;

        foreach ($chatIds as $chatId) {
            if ($telegram->sendDocument($chatId, $artifact['path'], $caption)) {
                $sent++;
            }
        }

        if ($sent === 0) {
            return ['ok' => false, 'message' => 'بکاپ ساخته شد اما ارسال به تلگرام ناموفق بود.'];
        }

        return ['ok' => true, 'message' => "بکاپ به {$sent} چت تلگرام ارسال شد."];
    }

    private function cleanupRetention(int $retentionCount): void
    {
        $files = collect(File::files($this->backupDirectory()))
            ->filter(fn ($file) => str_ends_with($file->getFilename(), '.sql.gz'))
            ->sortByDesc(fn ($file) => $file->getMTime())
            ->values();

        foreach ($files->slice($retentionCount) as $stale) {
            @unlink($stale->getPathname());
        }
    }

    private function backupDirectory(): string
    {
        return storage_path('app/backups/database');
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
            configured: trim((string) config('bahram.backup.mysqldump_path', '')),
            fallbacks: ['mysqldump', 'mysqldump.exe'],
            windowsPaths: $this->discoverWindowsMysqlToolPaths('mysqldump.exe'),
        );
    }

    private function mysqlBinary(): ?string
    {
        return $this->resolveMysqlTool(
            configured: trim((string) config('bahram.backup.mysql_path', '')),
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
