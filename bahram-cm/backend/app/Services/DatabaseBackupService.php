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

class DatabaseBackupService
{
    private const TELEGRAM_MAX_BYTES = 50 * 1024 * 1024;

    public function __construct(private readonly MysqlDatabaseDumper $dumper) {}

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
            'retention_count' => (int) ($settings->retention_count ?? 30),
            'last_backup_at' => $settings->last_backup_at?->toIso8601String(),
            'last_backup_status' => $settings->last_backup_status,
            'last_backup_message' => $settings->last_backup_message,
            'last_backup_size_bytes' => $settings->last_backup_size_bytes,
            'telegram_configured' => $telegram->isConfigured() && $chatIds !== [],
            'telegram_chat_count' => count($chatIds),
            'mysqldump_available' => $this->mysqldumpBinary() !== null,
            'database_name' => $this->databaseName(),
            'site_media_available' => is_dir($this->siteMediaPath()),
            'private_media_available' => is_dir($this->privateMediaPath()),
            'database_row_estimate' => $this->dumper->estimateDatabaseRowCount($this->mysqlConfig()),
            'latest_dump_stats' => $this->latestDumpStats(),
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

    /** @return array{path: string, filename: string, size_bytes: int, stats: array{create_count: int, insert_count: int, tables_with_data: int, tables_backed_up: int}} */
    public function createDumpArtifactWithRetry(): array
    {
        $maxAttempts = max(1, (int) config('bahram.backup.max_attempts', 3));
        $sleepSeconds = max(1, (int) config('bahram.backup.retry_sleep_seconds', 5));
        $lastError = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                return $this->createDumpArtifact();
            } catch (Throwable $e) {
                $lastError = $e;
                Log::warning('Database backup attempt failed.', [
                    'attempt' => $attempt,
                    'max_attempts' => $maxAttempts,
                    'message' => $e->getMessage(),
                ]);

                if ($attempt < $maxAttempts) {
                    sleep(min(60, $sleepSeconds * $attempt));
                }
            }
        }

        $message = $lastError?->getMessage() ?? 'خطای نامشخص';
        $this->notifyBackupFailureAlert($message, $maxAttempts);

        throw $lastError ?? new RuntimeException('بکاپ دیتابیس ناموفق بود.');
    }

    /** @return array{ok: bool, message: string, path?: string, filename?: string, size_bytes?: int} */
    public function runBackup(bool $sendToTelegram): array
    {
        $settings = DatabaseBackupSetting::current();

        try {
            $artifact = $this->createDumpArtifactWithRetry();

            $message = 'بکاپ کامل دیتابیس (بهرام + کلاب) با موفقیت ساخته شد.';
            if (isset($artifact['stats'])) {
                $message .= sprintf(
                    ' (%d جدول با داده، %d INSERT)',
                    $artifact['stats']['tables_backed_up'],
                    $artifact['stats']['insert_count'],
                );
            }
            $status = 'success';

            $offsiteResult = $this->uploadToDownloadHostIfConfigured($artifact);
            if ($offsiteResult !== null) {
                if ($offsiteResult['ok']) {
                    $message .= ' هاست دانلود: '.$offsiteResult['message'];
                } else {
                    $status = 'partial';
                    $message .= ' هاست دانلود: '.$offsiteResult['message'];
                }
            }

            if ($sendToTelegram) {
                $telegramResult = $this->sendArtifactToTelegram($artifact);
                if (! $telegramResult['ok']) {
                    $status = 'partial';
                    $message = $telegramResult['message'];
                } else {
                    $message = 'بکاپ ساخته و به تلگرام ارسال شد.';
                    if ($offsiteResult !== null && $offsiteResult['ok']) {
                        $message .= ' ('.$offsiteResult['message'].')';
                    }
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

    /** @param  array{path: string, filename: string, size_bytes: int}  $artifact
     * @return array{ok: bool, message: string}|null
     */
    private function uploadToDownloadHostIfConfigured(array $artifact): ?array
    {
        try {
            $offsite = app(DownloadHostBackupService::class);
            if (! $offsite->isConfigured()) {
                return null;
            }

            return $offsite->uploadDatabaseArtifact(
                $artifact['path'],
                (int) $artifact['size_bytes'],
                $artifact['filename'],
            );
        } catch (Throwable $e) {
            Log::warning('Download-host backup upload failed after local dump.', [
                'message' => $e->getMessage(),
            ]);

            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    private function notifyBackupFailureAlert(string $errorMessage, int $attempts): void
    {
        $telegram = TelegramBotClient::fromAdminConfig();
        $chatIds = TelegramBotClient::adminChatIds();

        if (! $telegram->isConfigured() || $chatIds === []) {
            return;
        }

        $database = $this->databaseName();
        $text = '<b>⛔ بکاپ دیتابیس ناموفق</b>'."\n"
            .'دیتابیس: '.config('app.name')." ({$database})\n"
            ."پس از {$attempts} تلاش، بکاپ کامل ساخته نشد.\n"
            .'خطا: '.$errorMessage;

        foreach ($chatIds as $chatId) {
            $telegram->sendMessage($chatId, $text);
        }
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

    /** @return array{path: string, filename: string, size_bytes: int, stats: array{create_count: int, insert_count: int, tables_with_data: int, tables_backed_up: int}} */
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

        $stats = $this->dumper->dumpDatabaseToGzip(
            $binary,
            $config,
            $gzPath,
            $this->mysqlCliArguments($config),
            $this->mysqlProcessEnv($config),
            $this->dumpTimeoutSeconds(),
        );

        $artifact = [
            'path' => $gzPath,
            'filename' => $filename,
            'size_bytes' => filesize($gzPath) ?: 0,
            'stats' => $stats,
        ];

        $this->pruneLocalBackups();

        return $artifact;
    }

    /** @return array{path: string, filename: string, size_bytes: int} */
    public function createMediaArtifact(): array
    {
        return $this->createZipDirectoryArtifact(
            source: $this->siteMediaPath(),
            zipPrefix: 'media',
            filenamePrefix: 'media_backup',
            outputDirectory: $this->mediaBackupDirectory(),
            missingSourceMessage: 'پوشه media یافت نشد.',
        );
    }

    /**
     * Private site files (KYC card images, selfie videos, etc.) under storage/app/private.
     *
     * @return array{path: string, filename: string, size_bytes: int}
     */
    public function createPrivateMediaArtifact(): array
    {
        File::ensureDirectoryExists($this->privateMediaPath());

        return $this->createZipDirectoryArtifact(
            source: $this->privateMediaPath(),
            zipPrefix: 'private',
            filenamePrefix: 'private_media_backup',
            outputDirectory: $this->privateMediaBackupDirectory(),
            missingSourceMessage: 'پوشه private media یافت نشد.',
        );
    }

    /**
     * @return array{path: string, filename: string, size_bytes: int}
     */
    private function createZipDirectoryArtifact(
        string $source,
        string $zipPrefix,
        string $filenamePrefix,
        string $outputDirectory,
        string $missingSourceMessage,
    ): array {
        if (! is_dir($source)) {
            throw new RuntimeException($missingSourceMessage);
        }

        File::ensureDirectoryExists($outputDirectory);

        $timestamp = now()->format('Y-m-d_His');
        $filename = "{$filenamePrefix}_{$timestamp}.zip";
        $zipPath = $outputDirectory.DIRECTORY_SEPARATOR.$filename;

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('ساخت فایل ZIP ناموفق بود.');
        }

        $sourceReal = realpath($source);
        if ($sourceReal === false) {
            $zip->close();
            @unlink($zipPath);

            throw new RuntimeException("مسیر {$zipPrefix} نامعتبر است.");
        }

        $hasFiles = false;
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourceReal, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($iterator as $file) {
            /** @var \SplFileInfo $file */
            $path = $file->getPathname();
            $relative = $zipPrefix.'/'.substr($path, strlen($sourceReal) + 1);

            if ($file->isDir()) {
                $zip->addEmptyDir(str_replace('\\', '/', $relative));
            } else {
                $zip->addFile($path, str_replace('\\', '/', $relative));
                $hasFiles = true;
            }
        }

        if (! $hasFiles) {
            $zip->addEmptyDir($zipPrefix);
        }

        $zip->close();

        if (! is_file($zipPath)) {
            throw new RuntimeException('فایل ZIP ساخته نشد.');
        }

        $artifact = [
            'path' => $zipPath,
            'filename' => $filename,
            'size_bytes' => filesize($zipPath) ?: 0,
        ];

        $this->pruneLocalBackups();

        return $artifact;
    }

    public function restoreUploadedFile(UploadedFile $file): void
    {
        $this->ensureMysql();

        $sql = $this->readSqlPayload($file);
        if ($sql === '') {
            throw new RuntimeException('فایل بکاپ خالی است.');
        }

        $tmpPath = $this->writeRestoreTempSql($sql);

        try {
            $cliError = null;
            $binary = $this->mysqlBinary();
            if ($binary !== null) {
                try {
                    $this->restoreViaMysqlCli($binary, $tmpPath);

                    return;
                } catch (RuntimeException $e) {
                    $cliError = $e->getMessage();
                    Log::warning('Database restore via mysql CLI failed, trying PHP driver.', [
                        'message' => $cliError,
                    ]);
                }
            }

            try {
                $this->restoreViaMysqli($sql);

                return;
            } catch (Throwable $e) {
                $detail = $e->getMessage();
                if ($cliError !== null) {
                    $detail = 'CLI: '.$cliError.' | PHP: '.$detail;
                }

                throw new RuntimeException('بازیابی دیتابیس ناموفق بود: '.$detail);
            }
        } finally {
            @unlink($tmpPath);
        }
    }

    private function writeRestoreTempSql(string $sql): string
    {
        $tmpDir = $this->backupDirectory();
        File::ensureDirectoryExists($tmpDir);
        $tmpPath = $tmpDir.DIRECTORY_SEPARATOR.'restore_'.now()->format('Ymd_His').'_'.uniqid('', true).'.sql';

        if (file_put_contents($tmpPath, $sql) === false) {
            throw new RuntimeException('نوشتن فایل موقت بازیابی ناموفق بود.');
        }

        @chmod($tmpPath, 0600);

        $backupReal = realpath($tmpDir);
        $fileReal = realpath($tmpPath);
        if ($backupReal === false || $fileReal === false || ! str_starts_with($fileReal, $backupReal)) {
            @unlink($tmpPath);

            throw new RuntimeException('مسیر فایل موقت بازیابی نامعتبر است.');
        }

        return $tmpPath;
    }

    private function restoreViaMysqlCli(string $binary, string $tmpPath): void
    {
        $config = $this->mysqlConfig();
        $sourcePath = str_replace('\\', '/', $tmpPath);
        $env = $this->mysqlProcessEnv($config);
        $errors = [];

        foreach ($this->mysqlCliArgumentVariants($config) as $variant) {
            $command = array_merge(
                [$binary],
                $variant,
                [$config['database'], '--execute', 'source '.$sourcePath],
            );

            $process = new Process($command, null, $env, null, 3600);
            $process->run();

            if ($process->isSuccessful()) {
                return;
            }

            $errors[] = trim($process->getErrorOutput() ?: $process->getOutput());
        }

        if (PHP_OS_FAMILY === 'Windows') {
            try {
                $this->restoreViaMysqlCliStdinRedirect($binary, $config, $tmpPath);

                return;
            } catch (RuntimeException $e) {
                $errors[] = $e->getMessage();
            }
        }

        throw new RuntimeException(implode(' | ', array_filter($errors)) ?: 'mysql CLI restore failed');
    }

    /** @param  array{host: string, port: int|string, database: string, username: string, password: string, socket: string}  $config */
    private function restoreViaMysqlCliStdinRedirect(string $binary, array $config, string $tmpPath): void
    {
        $env = $this->mysqlProcessEnv($config);
        $parts = array_merge(
            [$this->quoteShellArg($binary)],
            array_map(fn (string $arg) => $this->quoteShellArg($arg), $this->mysqlCliArguments($config)),
            [$this->quoteShellArg($config['database'])],
        );

        $redirect = PHP_OS_FAMILY === 'Windows'
            ? '< '.$this->quoteShellArg($tmpPath)
            : '< '.escapeshellarg($tmpPath);

        $process = Process::fromShellCommandline(implode(' ', $parts).' '.$redirect, null, $env, null, 3600);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException(trim($process->getErrorOutput() ?: $process->getOutput()));
        }
    }

    private function quoteShellArg(string $value): string
    {
        if (PHP_OS_FAMILY === 'Windows') {
            return '"'.str_replace('"', '""', $value).'"';
        }

        return escapeshellarg($value);
    }

    /** @param  array{host: string, port: int|string, database: string, username: string, password: string, socket: string}  $config
     * @return list<list<string>>
     */
    private function mysqlCliArgumentVariants(array $config): array
    {
        $variants = [$this->mysqlCliArguments($config)];

        $socket = $config['socket'] !== '' ? $config['socket'] : $this->discoverWindowsMysqlSocket();
        if ($socket !== null) {
            $variants[] = [
                '--default-character-set=utf8mb4',
                '--socket='.$socket,
                '--user='.$config['username'],
            ];
        }

        return $variants;
    }

    private function discoverWindowsMysqlSocket(): ?string
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return null;
        }

        foreach (glob('C:\\laragon\\data\\mysql-*\\mysql.sock') ?: [] as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    private function restoreViaMysqli(string $sql): void
    {
        if (! extension_loaded('mysqli')) {
            throw new RuntimeException('درایور mysqli در PHP فعال نیست.');
        }

        $config = $this->mysqlConfig();
        $host = $config['host'];
        $port = (int) $config['port'];
        $socket = $config['socket'] !== '' ? $config['socket'] : ($this->discoverWindowsMysqlSocket() ?? '');

        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

        try {
            if ($socket !== '') {
                $mysqli = new \mysqli($host, $config['username'], $config['password'], $config['database'], $port, $socket);
            } else {
                $mysqli = new \mysqli($host, $config['username'], $config['password'], $config['database'], $port);
            }
        } catch (\mysqli_sql_exception $e) {
            throw new RuntimeException('اتصال mysqli برای بازیابی ناموفق بود: '.$e->getMessage());
        }

        try {
            $mysqli->set_charset('utf8mb4');
            $mysqli->query('SET FOREIGN_KEY_CHECKS=0');
            $mysqli->query('SET NAMES utf8mb4');

            $payload = $this->normalizeDumpSqlForMysqli($sql);

            try {
                $this->mysqliRunMultiQuery($mysqli, $payload);
            } catch (\mysqli_sql_exception $e) {
                if (! $this->shouldRetryMysqliBatchRestore($e->getMessage())) {
                    throw $e;
                }
                $this->mysqliRunBatchQuery($mysqli, $payload);
            }

            $mysqli->query('SET FOREIGN_KEY_CHECKS=1');
        } catch (\mysqli_sql_exception $e) {
            throw new RuntimeException('بازیابی mysqli ناموفق بود: '.$e->getMessage());
        } finally {
            $mysqli->close();
        }
    }

    private function mysqliRunMultiQuery(\mysqli $mysqli, string $payload): void
    {
        if (! $mysqli->multi_query($payload)) {
            throw new \mysqli_sql_exception($mysqli->error, $mysqli->errno);
        }

        do {
            $result = $mysqli->store_result();
            if ($result instanceof \mysqli_result) {
                $result->free();
            }
        } while ($mysqli->more_results() && $mysqli->next_result());

        if ($mysqli->errno !== 0) {
            throw new \mysqli_sql_exception($mysqli->error, $mysqli->errno);
        }
    }

    private function shouldRetryMysqliBatchRestore(string $message): bool
    {
        $lower = strtolower($message);

        return str_contains($lower, 'max_allowed_packet')
            || str_contains($lower, 'packet bigger')
            || str_contains($lower, 'gone away');
    }

    private function mysqliRunBatchQuery(\mysqli $mysqli, string $payload): void
    {
        foreach ($this->splitSqlStatements($payload) as $statement) {
            if ($statement === '') {
                continue;
            }
            $mysqli->query($statement);
        }
    }

    /** @return list<string> */
    private function splitSqlStatements(string $sql): array
    {
        $statements = [];
        $buffer = '';
        $inString = false;
        $escape = false;
        $len = strlen($sql);

        for ($i = 0; $i < $len; $i++) {
            $char = $sql[$i];
            $buffer .= $char;

            if ($escape) {
                $escape = false;

                continue;
            }

            if ($char === '\\' && $inString) {
                $escape = true;

                continue;
            }

            if ($char === "'") {
                $inString = ! $inString;

                continue;
            }

            if (! $inString && $char === ';') {
                $statement = trim($buffer);
                $buffer = '';
                if ($statement !== '' && ! str_starts_with($statement, '--')) {
                    $statements[] = $statement;
                }
            }
        }

        $tail = trim($buffer);
        if ($tail !== '' && ! str_starts_with($tail, '--')) {
            $statements[] = $tail;
        }

        return $statements;
    }

    private function normalizeDumpSqlForMysqli(string $sql): string
    {
        $sql = preg_replace('/^DELIMITER\s+\S+\s*$/m', '', $sql) ?? $sql;

        return str_replace('$$', ';', $sql);
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

    public function pruneLocalBackups(?int $retentionDays = null): void
    {
        $retentionDays = max(1, $retentionDays ?? $this->retentionDays());
        $cutoff = now()->subDays($retentionDays)->getTimestamp();

        $this->pruneDirectoryOlderThan($this->backupDirectory(), '.sql.gz', $cutoff);
        $this->pruneDirectoryOlderThan($this->mediaBackupDirectory(), '.zip', $cutoff);
        $this->pruneDirectoryOlderThan($this->privateMediaBackupDirectory(), '.zip', $cutoff);
    }

    private function retentionDays(): int
    {
        $fromSettings = (int) (DatabaseBackupSetting::current()->retention_count ?? 0);
        if ($fromSettings > 0) {
            return $fromSettings;
        }

        return max(1, (int) config('bahram.backup.retention_days', 30));
    }

    private function pruneDirectoryOlderThan(string $directory, string $suffix, int $cutoffTimestamp): void
    {
        if (! is_dir($directory)) {
            return;
        }

        foreach (File::files($directory) as $file) {
            if (! str_ends_with($file->getFilename(), $suffix)) {
                continue;
            }

            if ($file->getMTime() < $cutoffTimestamp) {
                @unlink($file->getPathname());
            }
        }
    }

    private function backupDirectory(): string
    {
        $configured = trim((string) config('bahram.backup.database_directory', ''));

        return $configured !== '' ? $configured : storage_path('app/backups/database');
    }

    private function dumpTimeoutSeconds(): int
    {
        return max(60, (int) config('bahram.backup.dump_timeout_seconds', 3600));
    }

    private function mediaBackupDirectory(): string
    {
        return storage_path('app/backups/media');
    }

    private function privateMediaBackupDirectory(): string
    {
        return storage_path('app/backups/private');
    }

    private function siteMediaPath(): string
    {
        return storage_path('app/public/media');
    }

    private function privateMediaPath(): string
    {
        return storage_path('app/private');
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

    /** @return array{host: string, port: int|string, database: string, username: string, password: string, socket: string} */
    private function mysqlConfig(): array
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");
        $host = (string) ($config['host'] ?? '127.0.0.1');
        $port = $config['port'] ?? 3306;

        if (preg_match('/^(.*):(\d+)$/', trim($host), $matches)
            && substr_count($host, ':') === 1
            && ! str_contains($host, ']')) {
            $host = $matches[1];
            $port = $matches[2];
        }

        return [
            'host' => $this->normalizeMysqlHost($host),
            'port' => $port,
            'database' => (string) ($config['database'] ?? ''),
            'username' => (string) ($config['username'] ?? ''),
            'password' => (string) ($config['password'] ?? ''),
            'socket' => trim((string) ($config['unix_socket'] ?? '')),
        ];
    }

    /** @param  array{host: string, port: int|string, database: string, username: string, password: string, socket: string}  $config
     * @return list<string>
     */
    private function mysqlCliArguments(array $config): array
    {
        $args = ['--default-character-set=utf8mb4'];

        if ($config['socket'] !== '') {
            $args[] = '--socket='.$config['socket'];

            return array_merge($args, ['--user='.$config['username']]);
        }

        $args[] = '--host='.$config['host'];
        $args[] = '--port='.(string) $config['port'];

        return array_merge($args, ['--user='.$config['username']]);
    }

    /** @param  array{password: string}  $config
     * @return array<string, string>
     */
    private function mysqlProcessEnv(array $config): array
    {
        return array_filter([
            'MYSQL_PWD' => $config['password'] !== '' ? $config['password'] : null,
        ]);
    }

    private function normalizeMysqlHost(string $host): string
    {
        $host = trim($host);

        // Windows/Laragon: "localhost" often breaks TCP clients (HY000 2004). Linux keeps
        // "localhost" so mysql CLI can use the socket when configured that way.
        if (PHP_OS_FAMILY === 'Windows' && ($host === '' || strtolower($host) === 'localhost')) {
            return '127.0.0.1';
        }

        return $host !== '' ? $host : '127.0.0.1';
    }

    private function databaseName(): string
    {
        return $this->mysqlConfig()['database'];
    }

    /** @return array{filename: string, create_count: int, insert_count: int, tables_backed_up: int, size_bytes: int}|null */
    private function latestDumpStats(): ?array
    {
        $dir = $this->backupDirectory();
        if (! is_dir($dir)) {
            return null;
        }

        $latest = collect(File::files($dir))
            ->filter(fn ($file) => str_ends_with($file->getFilename(), '.sql.gz'))
            ->sortByDesc(fn ($file) => $file->getMTime())
            ->first();

        if ($latest === null) {
            return null;
        }

        try {
            $stats = $this->dumper->analyzeGzipDumpFile($latest->getPathname());
        } catch (Throwable) {
            return null;
        }

        return [
            'filename' => $latest->getFilename(),
            'create_count' => $stats['create_count'],
            'insert_count' => $stats['insert_count'],
            'tables_backed_up' => count($stats['insert_tables']),
            'size_bytes' => $latest->getSize(),
        ];
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
        $dump = $this->mysqldumpBinary();
        if ($dump !== null) {
            $paired = preg_replace('/mysqldump(\.exe)?$/i', 'mysql$1', $dump);
            if (is_string($paired) && $paired !== $dump && is_file($paired)) {
                return $paired;
            }
        }

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
