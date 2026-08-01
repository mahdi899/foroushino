<?php

namespace Tests\Unit;

use App\Services\MysqlDatabaseDumper;
use RuntimeException;
use Tests\TestCase;

class MysqlDatabaseDumperTest extends TestCase
{
    public function test_dump_flags_include_full_data_export_options(): void
    {
        $flags = app(MysqlDatabaseDumper::class)->dumpFlags();

        $this->assertContains('--single-transaction', $flags);
        $this->assertContains('--hex-blob', $flags);
        $this->assertNotContains('--no-data', $flags);
        $this->assertNotContains('--no-create-info', $flags);
    }

    public function test_validate_sql_dump_rejects_schema_only_when_tables_have_data(): void
    {
        $path = $this->writeTempSql(<<<'SQL'
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL
) ENGINE=InnoDB;
SQL);

        /** @var MysqlDatabaseDumper $dumper */
        $dumper = \Mockery::mock(MysqlDatabaseDumper::class)->makePartial();
        $dumper->shouldReceive('tablesWithEstimatedRows')->andReturn(['users']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('بکاپ ناقص است');

        try {
            $dumper->validateSqlDumpFile($path, [
                'host' => '127.0.0.1',
                'port' => 3306,
                'database' => 'bahram_backend',
                'username' => 'root',
                'password' => '',
                'socket' => '',
            ]);
        } finally {
            @unlink($path);
        }
    }

    public function test_analyze_sql_dump_detects_insert_tables(): void
    {
        $path = $this->writeTempSql(<<<'SQL'
CREATE TABLE `users` (`id` int NOT NULL);
INSERT INTO `users` VALUES (1),(2);
CREATE TABLE `orders` (`id` int NOT NULL);
INSERT INTO `orders` VALUES (10);
SQL);

        $stats = app(MysqlDatabaseDumper::class)->analyzeSqlDumpFile($path);
        @unlink($path);

        $this->assertSame(2, $stats['create_count']);
        $this->assertSame(2, $stats['insert_count']);
        $this->assertEqualsCanonicalizing(['users', 'orders'], $stats['insert_tables']);
    }

    private function writeTempSql(string $sql): string
    {
        $path = sys_get_temp_dir().DIRECTORY_SEPARATOR.'dump_test_'.uniqid('', true).'.sql';
        file_put_contents($path, $sql);

        return $path;
    }
}
