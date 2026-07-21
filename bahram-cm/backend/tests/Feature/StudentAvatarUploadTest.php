<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserProfile;
use App\Services\Student\StudentAvatarStorage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentAvatarUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_avatar_upload_stores_under_media_avatars_on_public_disk(): void
    {
        Storage::fake('public');

        $user = User::create([
            'name' => 'کاربر',
            'mobile' => '09121234567',
            'status' => 'active',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/student/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('face.jpg', 200, 200),
        ]);

        $response->assertOk();
        $avatar = $response->json('data.profile.avatar');
        $this->assertIsString($avatar);
        $this->assertMatchesRegularExpression(
            '#^/storage/media/avatars/'.$user->id.'/[A-Z0-9]+\.jpg$#',
            $avatar,
        );

        $relative = ltrim(substr($avatar, strlen('/storage/')), '/');
        Storage::disk('public')->assertExists($relative);
        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $user->id,
            'avatar' => $avatar,
        ]);
    }

    public function test_avatar_upload_replaces_previous_local_file(): void
    {
        Storage::fake('public');

        $user = User::create([
            'name' => 'کاربر',
            'mobile' => '09129876543',
            'status' => 'active',
        ]);

        $oldPath = 'media/avatars/'.$user->id.'/oldavatar.png';
        UserProfile::create([
            'user_id' => $user->id,
            'avatar' => '/storage/'.$oldPath,
        ]);
        Storage::disk('public')->put($oldPath, 'old');

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/student/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('new.jpg', 180, 180),
        ])->assertOk();

        Storage::disk('public')->assertMissing($oldPath);
        $avatar = $response->json('data.profile.avatar');
        $this->assertIsString($avatar);
        Storage::disk('public')->assertExists(ltrim(substr($avatar, strlen('/storage/')), '/'));
    }

    public function test_avatar_upload_failure_returns_try_later_message(): void
    {
        Storage::fake('public');

        $user = User::create([
            'name' => 'کاربر',
            'mobile' => '09120001122',
            'status' => 'active',
        ]);

        Sanctum::actingAs($user);

        $this->mock(StudentAvatarStorage::class, function ($mock) {
            $mock->shouldReceive('store')
                ->once()
                ->andThrow(new \RuntimeException(
                    'آپلود عکس پروفایل الان ممکن نیست. لطفاً ساعات دیگر دوباره امتحان کنید.',
                ));
        });

        $this->postJson('/api/v1/student/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('face.jpg', 120, 120),
        ])
            ->assertStatus(502)
            ->assertJsonPath(
                'error.message_fa',
                'آپلود عکس پروفایل الان ممکن نیست. لطفاً ساعات دیگر دوباره امتحان کنید.',
            );
    }

    public function test_migrate_legacy_avatar_moves_to_media_path(): void
    {
        Storage::fake('public');

        $user = User::create([
            'name' => 'قدیمی',
            'mobile' => '09121112233',
            'status' => 'active',
        ]);

        Storage::disk('public')->put('avatars/'.$user->id.'/avatar.jpg', 'legacy-bytes');

        $next = app(StudentAvatarStorage::class)->migrateLegacyReference(
            '/storage/avatars/'.$user->id.'/avatar.jpg',
        );

        $this->assertSame('/storage/media/avatars/'.$user->id.'/avatar.jpg', $next);
        Storage::disk('public')->assertExists('media/avatars/'.$user->id.'/avatar.jpg');
        Storage::disk('public')->assertMissing('avatars/'.$user->id.'/avatar.jpg');
    }
}
