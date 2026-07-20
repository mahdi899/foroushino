<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Models\DatabaseBackupSetting;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Models\User;
use App\Services\DatabaseBackupService;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SmsCenterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DatabaseBackupSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->seed(SmsCenterSeeder::class);
    }

    public function test_super_admin_can_view_backup_settings(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/panel/settings/database-backup')
            ->assertOk()
            ->assertJsonStructure(['data' => ['database_name', 'schedule_time', 'mysqldump_available']])
            ->assertJsonPath('data.schedule_time', '04:00');
    }

    public function test_super_admin_can_update_backup_settings(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/v1/panel/settings/database-backup', [
                'is_auto_enabled' => true,
                'schedule_time' => '05:30',
                'send_to_telegram' => false,
                'retention_count' => 10,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_auto_enabled', true)
            ->assertJsonPath('data.schedule_time', '05:30')
            ->assertJsonPath('data.send_to_telegram', false)
            ->assertJsonPath('data.retention_count', 10);
    }

    public function test_test_telegram_endpoint_requires_bot_and_chat_ids(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/panel/settings/database-backup/test-telegram')
            ->assertStatus(422)
            ->assertJsonPath('data.ok', false);
    }

    public function test_test_telegram_sends_message_when_configured(): void
    {
        $admin = $this->superAdmin();

        SmsProvider::query()->where('slug', 'telegram')->first()?->update([
            'is_active' => true,
            'credentials' => 'telegram-test-token',
        ]);

        SmsSetting::current()->update([
            'admin_telegram_enabled' => true,
            'admin_telegram_chat_ids' => '123456789',
        ]);

        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true], 200),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/panel/settings/database-backup/test-telegram')
            ->assertOk()
            ->assertJsonPath('data.ok', true);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'sendMessage'));
    }

    public function test_should_run_scheduled_only_at_configured_time(): void
    {
        DatabaseBackupSetting::current()->update([
            'is_auto_enabled' => true,
            'schedule_time' => now()->format('H:i'),
        ]);

        $this->assertTrue(app(DatabaseBackupService::class)->shouldRunScheduled());

        DatabaseBackupSetting::current()->update([
            'last_backup_at' => now(),
        ]);

        $this->assertFalse(app(DatabaseBackupService::class)->shouldRunScheduled());
    }

    public function test_super_admin_can_export_media_zip(): void
    {
        $admin = $this->superAdmin();
        $mediaDir = storage_path('app/public/media/site');
        if (! is_dir($mediaDir)) {
            mkdir($mediaDir, 0777, true);
        }
        file_put_contents($mediaDir.'/test-backup.txt', 'backup-test');

        $this->actingAs($admin, 'sanctum')
            ->get('/api/v1/panel/settings/database-backup/export/media')
            ->assertOk()
            ->assertHeader('content-disposition');

        @unlink($mediaDir.'/test-backup.txt');
    }

    public function test_create_media_artifact_builds_zip(): void
    {
        $mediaDir = storage_path('app/public/media/site');
        if (! is_dir($mediaDir)) {
            mkdir($mediaDir, 0777, true);
        }
        file_put_contents($mediaDir.'/artifact-test.txt', 'x');

        $artifact = app(DatabaseBackupService::class)->createMediaArtifact();

        $this->assertStringEndsWith('.zip', $artifact['filename']);
        $this->assertGreaterThan(0, $artifact['size_bytes']);
        $this->assertFileExists($artifact['path']);

        @unlink($artifact['path']);
        @unlink($mediaDir.'/artifact-test.txt');
    }

    public function test_prune_local_backups_applies_retention_to_database_and_media_artifacts(): void
    {
        $dbDir = storage_path('app/backups/database');
        $mediaDir = storage_path('app/backups/media');
        if (! is_dir($dbDir)) {
            mkdir($dbDir, 0777, true);
        }
        if (! is_dir($mediaDir)) {
            mkdir($mediaDir, 0777, true);
        }

        $created = [];
        for ($i = 0; $i < 4; $i++) {
            $dbPath = $dbDir.'/backup_test_'.$i.'.sql.gz';
            $mediaPath = $mediaDir.'/media_backup_test_'.$i.'.zip';
            file_put_contents($dbPath, 'db');
            file_put_contents($mediaPath, 'media');
            touch($dbPath, now()->subDays($i)->getTimestamp());
            touch($mediaPath, now()->subDays($i)->getTimestamp());
            $created[] = $dbPath;
            $created[] = $mediaPath;
        }

        DatabaseBackupSetting::current()->update(['retention_count' => 2]);
        app(DatabaseBackupService::class)->pruneLocalBackups(2);

        $this->assertCount(2, glob($dbDir.'/*.sql.gz'));
        $this->assertCount(2, glob($mediaDir.'/*.zip'));

        foreach (glob($dbDir.'/*') ?: [] as $path) {
            @unlink($path);
        }
        foreach (glob($mediaDir.'/*') ?: [] as $path) {
            @unlink($path);
        }
    }

    private function superAdmin(): User
    {
        $user = User::factory()->create([
            'is_admin' => true,
            'email' => 'super@example.com',
        ]);
        $user->assignRole(AdminRoleName::SuperAdmin->value);

        return $user;
    }
}
