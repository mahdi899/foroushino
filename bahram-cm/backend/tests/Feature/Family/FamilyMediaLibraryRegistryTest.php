<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Models\FamilyMedia;
use App\Models\Media;
use App\Models\User;
use App\Services\Family\FamilyMediaLibraryRegistry;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyMediaLibraryRegistryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        Storage::fake('public');
    }

    public function test_ready_family_media_registers_in_shared_library_under_media_family(): void
    {
        $uploader = User::factory()->create(['is_admin' => true]);
        $path = 'media/family/demo/demo-image-1.jpg';

        Storage::disk('public')->put($path, 'fake-image');

        $familyMedia = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Image,
            'disk' => 'public',
            'storage_path' => $path,
            'original_filename' => 'demo-image-1.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 11,
            'status' => FamilyMediaStatus::Ready,
            'uploaded_by' => $uploader->id,
        ]);

        $library = app(FamilyMediaLibraryRegistry::class)->register($familyMedia->fresh());

        $this->assertInstanceOf(Media::class, $library);
        $this->assertDatabaseHas('media', [
            'path' => $path,
            'disk' => 'public',
            'category' => FamilyMediaLibraryRegistry::CATEGORY,
            'type' => 'image',
        ]);
    }

    public function test_legacy_family_demo_path_is_not_registered(): void
    {
        $uploader = User::factory()->create(['is_admin' => true]);

        $familyMedia = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Image,
            'disk' => 'public',
            'storage_path' => 'family-demo/demo-image-1.jpg',
            'status' => FamilyMediaStatus::Ready,
            'uploaded_by' => $uploader->id,
        ]);

        $library = app(FamilyMediaLibraryRegistry::class)->register($familyMedia);

        $this->assertNull($library);
        $this->assertDatabaseCount('media', 0);
    }

    public function test_site_sync_skipped_when_disabled(): void
    {
        $uploader = User::factory()->create(['is_admin' => true]);
        $path = 'media/family/demo/sync-off.jpg';
        Storage::disk('public')->put($path, 'fake-image');

        \App\Models\Setting::query()->updateOrCreate(
            ['group' => 'family', 'key' => 'media_pipeline'],
            ['value' => ['sync_to_site_library' => false]],
        );
        \App\Services\Family\FamilyMediaSettingsService::forgetCachedConfig();

        $familyMedia = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Image,
            'disk' => 'public',
            'storage_path' => $path,
            'status' => FamilyMediaStatus::Ready,
            'uploaded_by' => $uploader->id,
        ]);

        app(\App\Services\Family\FamilyMediaSiteSync::class)->sync($familyMedia);

        $this->assertDatabaseCount('media', 0);
    }
}
