<?php

declare(strict_types=1);

/**
 * Import a .sql dump into the local DB from .env (no media files touched).
 * Usage: php scripts/_tmp-import-sql.php path/to/dump.sql
 */

$dump = $argv[1] ?? '';
if ($dump === '' || ! is_file($dump)) {
    fwrite(STDERR, "Usage: php scripts/_tmp-import-sql.php <dump.sql>\n");
    exit(1);
}

$envPath = dirname(__DIR__).'/.env';
$env = [];
foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
    if (str_starts_with(trim($line), '#') || ! str_contains($line, '=')) {
        continue;
    }
    [$k, $v] = explode('=', $line, 2);
    $env[trim($k)] = trim($v, " \t\"'");
}

$host = $env['DB_HOST'] ?? '127.0.0.1';
$port = $env['DB_PORT'] ?? '3306';
$name = $env['DB_DATABASE'] ?? 'bahram_backend';
$user = $env['DB_USERNAME'] ?? 'root';
$pass = $env['DB_PASSWORD'] ?? '';

echo "Connecting {$user}@{$host}:{$port} → recreate {$name}\n";

$pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
$pdo->exec("DROP DATABASE IF EXISTS `{$name}`");
$pdo->exec("CREATE DATABASE `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$pdo->exec("USE `{$name}`");

$sql = file_get_contents($dump);
if ($sql === false || $sql === '') {
    fwrite(STDERR, "Empty dump\n");
    exit(1);
}

// Strip mysqldump conditional comments that confuse multi-statement exec in some clients
$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
$pdo->exec("SET NAMES utf8mb4");
$pdo->exec("SET sql_mode='NO_AUTO_VALUE_ON_ZERO'");

$offset = 0;
$len = strlen($sql);
$statements = 0;
$buf = '';
$inString = false;
$stringChar = '';

while ($offset < $len) {
    $ch = $sql[$offset];

    if ($inString) {
        $buf .= $ch;
        if ($ch === '\\' && $offset + 1 < $len) {
            $buf .= $sql[$offset + 1];
            $offset += 2;
            continue;
        }
        if ($ch === $stringChar) {
            $inString = false;
        }
        $offset++;
        continue;
    }

    if ($ch === "'" || $ch === '"' || $ch === '`') {
        $inString = true;
        $stringChar = $ch;
        $buf .= $ch;
        $offset++;
        continue;
    }

    // line comment --
    if ($ch === '-' && ($offset + 1) < $len && $sql[$offset + 1] === '-' && (($offset + 2) >= $len || $sql[$offset + 2] === "\n" || $sql[$offset + 2] === "\r" || $sql[$offset + 2] === ' ')) {
        while ($offset < $len && $sql[$offset] !== "\n") {
            $offset++;
        }
        continue;
    }

    // block /*! ... */ or /* ... */
    if ($ch === '/' && ($offset + 1) < $len && $sql[$offset + 1] === '*') {
        $end = strpos($sql, '*/', $offset + 2);
        if ($end === false) {
            break;
        }
        $block = substr($sql, $offset, $end - $offset + 2);
        // Keep executable conditional comments /*!40101 ... */
        if (preg_match('/^\/\*![0-9]{5}/', $block)) {
            $inner = preg_replace('/^\/\*![0-9]{5}\s*/', '', $block);
            $inner = preg_replace('/\*\/$/', '', (string) $inner);
            $buf .= trim((string) $inner).' ';
        }
        $offset = $end + 2;
        continue;
    }

    if ($ch === '#') {
        while ($offset < $len && $sql[$offset] !== "\n") {
            $offset++;
        }
        continue;
    }

    if ($ch === ';') {
        $stmt = trim($buf);
        $buf = '';
        $offset++;
        if ($stmt === '' || str_starts_with($stmt, 'DELIMITER')) {
            continue;
        }
        try {
            $pdo->exec($stmt);
            $statements++;
        } catch (Throwable $e) {
            fwrite(STDERR, 'Statement #'.($statements + 1).' failed: '.$e->getMessage()."\n");
            fwrite(STDERR, 'SQL head: '.substr($stmt, 0, 160)."\n");
            exit(1);
        }
        continue;
    }

    $buf .= $ch;
    $offset++;
}

$tail = trim($buf);
if ($tail !== '') {
    $pdo->exec($tail);
    $statements++;
}

$pdo->exec('SET FOREIGN_KEY_CHECKS=1');

$tables = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='{$name}'")->fetchColumn();
$users = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$products = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();

echo "Imported {$statements} statements. tables={$tables} users={$users} products={$products}\n";
