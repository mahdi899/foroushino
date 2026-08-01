<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUpTraits()
    {
        // Guard against RefreshDatabase wiping local MySQL when phpunit.xml
        // env overrides fail (e.g. inherited DB_* from `php artisan test`).
        $connection = config('database.default');
        $database = (string) config("database.connections.{$connection}.database");
        $isSafe = $connection === 'sqlite' || str_contains($database, ':memory:') || str_ends_with($database, 'testing');

        if (! $isSafe && in_array(RefreshDatabase::class, class_uses_recursive(static::class), true)) {
            throw new \RuntimeException(
                "Refusing to run RefreshDatabase against [{$connection}:{$database}]. "
                .'Use `vendor/bin/phpunit` with phpunit.xml DB_CONNECTION=sqlite (force=true), not a MySQL .env.'
            );
        }

        return parent::setUpTraits();
    }
}
