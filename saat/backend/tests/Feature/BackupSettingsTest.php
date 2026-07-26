<?php

use App\Models\DatabaseBackupSetting;
use App\Services\BackupService;

beforeEach(function () {
    seedRoles();
});

it('allows manager to view backup settings', function () {
    $manager = makeManager();

    $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/admin/backup')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonStructure(['data' => ['database_name', 'schedule_time', 'mysqldump_available']])
        ->assertJsonPath('data.schedule_time', '04:00');
});

it('allows manager to update backup settings', function () {
    $manager = makeManager();

    $this->actingAs($manager, 'sanctum')
        ->patchJson('/api/v1/admin/backup', [
            'is_auto_enabled' => true,
            'schedule_time' => '05:30',
            'retention_count' => 10,
        ])
        ->assertOk()
        ->assertJsonPath('data.is_auto_enabled', true)
        ->assertJsonPath('data.schedule_time', '05:30')
        ->assertJsonPath('data.retention_count', 10);
});

it('denies backup settings to agent', function () {
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/admin/backup')
        ->assertForbidden();
});

it('requires RESTORE confirm for database import', function () {
    $manager = makeManager();

    $this->actingAs($manager, 'sanctum')
        ->postJson('/api/v1/admin/backup/import/database', [
            'confirm' => 'WRONG',
        ])
        ->assertUnprocessable();
});

it('should run scheduled only at configured time', function () {
    DatabaseBackupSetting::current()->update([
        'is_auto_enabled' => true,
        'schedule_time' => now()->format('H:i'),
    ]);

    expect(app(BackupService::class)->shouldRunScheduled())->toBeTrue();

    DatabaseBackupSetting::current()->update([
        'last_backup_at' => now(),
    ]);

    expect(app(BackupService::class)->shouldRunScheduled())->toBeFalse();
});

it('creates storage zip artifact when storage app exists', function () {
    $service = app(\App\Services\BackupService::class);
    $artifact = $service->createStorageArtifact();

    expect($artifact['filename'])->toEndWith('.zip');
    expect($artifact['size_bytes'])->toBeGreaterThan(0);
    expect(is_file($artifact['path']))->toBeTrue();

    @unlink($artifact['path']);
});

it('prunes daily backups older than retention days', function () {
    $dir = storage_path('app/backups/daily');
    if (! is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $old = $dir.'/old.sql.gz';
    $fresh = $dir.'/fresh.sql.gz';
    file_put_contents($old, 'old');
    file_put_contents($fresh, 'fresh');
    touch($old, now()->subDays(40)->getTimestamp());
    touch($fresh, now()->getTimestamp());

    app(BackupService::class)->pruneDailyBackups(30);

    expect(is_file($old))->toBeFalse();
    expect(is_file($fresh))->toBeTrue();

    foreach (glob($dir.'/*') ?: [] as $path) {
        @unlink($path);
    }
});
