<?php

declare(strict_types=1);

namespace TelegramHost\Db;

final class Connection
{
    private static ?\PDO $pdo = null;

    /** @param array<string, mixed> $config */
    public static function get(array $config): \PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $db = $config['db'];
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $db['host'],
            $db['port'] ?? 3306,
            $db['database'],
            $db['charset'] ?? 'utf8mb4',
        );

        $options = [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
            // Reuses the TCP connection to MySQL across PHP-FPM requests,
            // skipping the connect+auth handshake on every webhook hit.
            \PDO::ATTR_PERSISTENT => true,
        ];
        if (defined('PDO::MYSQL_ATTR_CONNECT_TIMEOUT')) {
            $options[\PDO::MYSQL_ATTR_CONNECT_TIMEOUT] = 5;
        }

        self::$pdo = new \PDO($dsn, $db['username'], $db['password'], $options);

        return self::$pdo;
    }
}
