<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Full MySQL logical backup: schema + row data for every table in the configured database.
 */
class MysqlDatabaseDumper
{
    /** @return list<string> */
    public function dumpFlags(): array
    {
        return [
            '--single-transaction',
            '--quick',
            '--routines',
            '--triggers',
            '--events',
            '--hex-blob',
            '--column-statistics=0',
            '--set-gtid-purged=OFF',
        ];
    }

    /**
     * @param  array{host: string, port: int|string, database: string, username: string, password: string, socket: string}  $config
     * @return array{create_count: int, insert_count: int, tables_with_data: int, tables_backed_up: int}
     */
    public function dumpDatabaseToGzip(
        string $mysqldumpBinary,
        array $config,
        string $gzPath,
        array $cliArgs,
        array $env,
        int $timeoutSeconds,
    ): array {
        File::ensureDirectoryExists(dirname($gzPath));

        $sqlPath = str_ends_with($gzPath, '.gz')
            ? substr($gzPath, 0, -3)
            : $gzPath.'.sql';

        $command = array_merge(
            [$mysqldumpBinary],
            $cliArgs,
            $this->dumpFlags(),
            [
                '--result-file='.$sqlPath,
                $config['database'],
            ],
        );

        $process = new Process($command, null, $env, null, $timeoutSeconds);
        $process->run();

        if (! $process->isSuccessful() || ! is_file($sqlPath)) {
            @unlink($sqlPath);

            throw new RuntimeException(
                'ساخت dump ناموفق بود: '.trim($process->getErrorOutput() ?: $process->getOutput()),
            );
        }

        try {
            $stats = $this->validateSqlDumpFile($sqlPath, $config);
            $this->gzipFile($sqlPath, $gzPath);
        } catch (Throwable $e) {
            @unlink($sqlPath);
            @unlink($gzPath);

            throw $e;
        } finally {
            @unlink($sqlPath);
        }

        if (! is_file($gzPath)) {
            throw new RuntimeException('فایل بکاپ فشرده ساخته نشد.');
        }

        return $stats;
    }

    /**
     * @param  array{host: string, port: int|string, database: string, username: string, password: string, socket: string}  $config
     * @return array{create_count: int, insert_count: int, tables_with_data: int, tables_backed_up: int}
     */
    public function validateSqlDumpFile(string $sqlPath, array $config): array
    {
        $stats = $this->analyzeSqlDumpFile($sqlPath);

        if ($stats['create_count'] === 0) {
            throw new RuntimeException('فایل بکاپ خالی یا نامعتبر است.');
        }

        $tablesWithData = $this->tablesWithEstimatedRows($config);
        $missing = array_values(array_diff($tablesWithData, $stats['insert_tables']));

        if ($missing !== []) {
            $preview = implode(', ', array_slice($missing, 0, 8));
            $suffix = count($missing) > 8 ? ' و '.(count($missing) - 8).' جدول دیگر' : '';

            throw new RuntimeException(
                "بکاپ ناقص است؛ داده این جداول در dump نیست: {$preview}{$suffix}. دسترسی SELECT کاربر DB یا mysqldump را بررسی کنید.",
            );
        }

        if ($stats['insert_count'] === 0 && $tablesWithData !== []) {
            throw new RuntimeException(
                'بکاپ فقط ساختار جداول را دارد و هیچ INSERT در آن نیست. mysqldump باید داده کامل دیتابیس را export کند.',
            );
        }

        return [
            'create_count' => $stats['create_count'],
            'insert_count' => $stats['insert_count'],
            'tables_with_data' => count($tablesWithData),
            'tables_backed_up' => count($stats['insert_tables']),
        ];
    }

    /** @return array{create_count: int, insert_count: int, insert_tables: list<string>} */
    public function analyzeSqlDumpFile(string $sqlPath): array
    {
        $handle = fopen($sqlPath, 'rb');
        if ($handle === false) {
            throw new RuntimeException('خواندن فایل dump ناموفق بود.');
        }

        $createCount = 0;
        $insertCount = 0;
        /** @var array<string, true> $insertTables */
        $insertTables = [];
        $carry = '';

        try {
            while (! feof($handle)) {
                $chunk = fread($handle, 1024 * 1024);
                if ($chunk === false || $chunk === '') {
                    break;
                }

                $window = $carry.$chunk;
                $createCount += preg_match_all('/CREATE TABLE `/', $window) ?: 0;
                $insertCount += preg_match_all('/INSERT INTO `/', $window) ?: 0;

                if (preg_match_all('/INSERT INTO `([^`]+)`/', $window, $matches)) {
                    foreach ($matches[1] as $table) {
                        $insertTables[(string) $table] = true;
                    }
                }

                $carry = substr($window, -128);
            }
        } finally {
            fclose($handle);
        }

        return [
            'create_count' => $createCount,
            'insert_count' => $insertCount,
            'insert_tables' => array_keys($insertTables),
        ];
    }

    /** @return array{create_count: int, insert_count: int, insert_tables: list<string>} */
    public function analyzeGzipDumpFile(string $gzPath): array
    {
        $handle = gzopen($gzPath, 'rb');
        if ($handle === false) {
            throw new RuntimeException('خواندن فایل بکاپ فشرده ناموفق بود.');
        }

        $createCount = 0;
        $insertCount = 0;
        /** @var array<string, true> $insertTables */
        $insertTables = [];
        $carry = '';

        try {
            while (! gzeof($handle)) {
                $chunk = gzread($handle, 1024 * 1024);
                if ($chunk === false || $chunk === '') {
                    break;
                }

                $window = $carry.$chunk;
                $createCount += preg_match_all('/CREATE TABLE `/', $window) ?: 0;
                $insertCount += preg_match_all('/INSERT INTO `/', $window) ?: 0;

                if (preg_match_all('/INSERT INTO `([^`]+)`/', $window, $matches)) {
                    foreach ($matches[1] as $table) {
                        $insertTables[(string) $table] = true;
                    }
                }

                $carry = substr($window, -128);
            }
        } finally {
            gzclose($handle);
        }

        return [
            'create_count' => $createCount,
            'insert_count' => $insertCount,
            'insert_tables' => array_keys($insertTables),
        ];
    }

    /**
     * @param  array{host: string, port: int|string, database: string, username: string, password: string, socket: string}  $config
     * @return list<string>
     */
    public function tablesWithEstimatedRows(array $config): array
    {
        try {
            $pdo = $this->pdoConnection($config);
            $statement = $pdo->prepare(
                'SELECT TABLE_NAME FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = ?
                   AND TABLE_TYPE = ?
                   AND IFNULL(TABLE_ROWS, 0) > 0
                 ORDER BY TABLE_NAME',
            );
            $statement->execute([$config['database'], 'BASE TABLE']);

            return array_map('strval', array_column($statement->fetchAll(\PDO::FETCH_ASSOC), 'TABLE_NAME'));
        } catch (Throwable) {
            return [];
        }
    }

    public function estimateDatabaseRowCount(array $config): int
    {
        try {
            $pdo = $this->pdoConnection($config);
            $statement = $pdo->prepare(
                'SELECT COALESCE(SUM(TABLE_ROWS), 0) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
            );
            $statement->execute([$config['database']]);

            return max(0, (int) $statement->fetchColumn());
        } catch (Throwable) {
            return 0;
        }
    }

  private function gzipFile(string $source, string $destination): void
    {
        $in = fopen($source, 'rb');
        if ($in === false) {
            throw new RuntimeException('خواندن فایل dump برای فشرده‌سازی ناموفق بود.');
        }

        $out = gzopen($destination, 'wb9');
        if ($out === false) {
            fclose($in);

            throw new RuntimeException('ساخت فایل gzip ناموفق بود.');
        }

        try {
            while (! feof($in)) {
                $chunk = fread($in, 1024 * 1024);
                if ($chunk === false) {
                    throw new RuntimeException('خواندن فایل dump در حین فشرده‌سازی ناموفق بود.');
                }
                if ($chunk === '') {
                    break;
                }
                if (gzwrite($out, $chunk) === false) {
                    throw new RuntimeException('نوشتن فایل gzip ناموفق بود.');
                }
            }
        } finally {
            fclose($in);
            gzclose($out);
        }
    }

    /** @param  array{host: string, port: int|string, database: string, username: string, password: string, socket: string}  $config */
    private function pdoConnection(array $config): \PDO
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $config['host'],
            (string) $config['port'],
            $config['database'],
        );

        return new \PDO($dsn, $config['username'], $config['password'], [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
    }
}
