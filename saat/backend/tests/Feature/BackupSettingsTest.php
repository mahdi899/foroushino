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

it('prunes local database and storage backup artifacts by retention count', function () {
    $dir = storage_path('app/backups');
    if (! is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    for ($i = 0; $i < 4; $i++) {
        $dbPath = $dir.'/backup_test_'.$i.'.sql.gz';
        $zipPath = $dir.'/storage_app_test_'.$i.'.zip';
        file_put_contents($dbPath, 'db');
        file_put_contents($zipPath, 'zip');
        touch($dbPath, now()->subDays($i)->getTimestamp());
        touch($zipPath, now()->subDays($i)->getTimestamp());
    }

    \App\Models\DatabaseBackupSetting::current()->update(['retention_count' => 2]);
    app(\App\Services\BackupService::class)->pruneLocalBackups(2);

    expect(glob($dir.'/*.sql.gz'))->toHaveCount(2);
    expect(glob($dir.'/*.zip'))->toHaveCount(2);

    foreach (glob($dir.'/*') ?: [] as $path) {
        @unlink($path);
    }
});
