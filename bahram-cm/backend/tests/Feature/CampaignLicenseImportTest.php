<?php

namespace Tests\Feature;

use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Services\CampaignLicenseImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignLicenseImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_creates_student_course_access_and_license(): void
    {
        $product = Product::query()->create([
            'title' => 'دوره کمپین‌نویسی',
            'slug' => 'campaign-writing',
            'type' => 'normal',
            'price' => 1_990_000,
            'is_active' => true,
            'spotplayer_course_id' => 'spot-course-1',
        ]);

        $csv = $this->makeCsv([
            [
                '_id' => 'test-license-1',
                'name' => 'علی تستی',
                'course' => 'دوره پولساز کمپین نویسی پیشرفته',
                'watermark' => '09121111111',
                'create' => '46213.5',
                'activate' => '46213.6',
                'download' => '0',
                'watch' => '0',
                'key' => 'license-key-001',
                'all.x' => '1',
                'all.n' => '1',
            ],
        ]);

        $stats = app(CampaignLicenseImportService::class)->import($csv, $product);

        $this->assertSame(1, $stats['rows']);
        $this->assertSame(1, $stats['users_created']);
        $this->assertSame(1, $stats['course_access_created']);
        $this->assertSame(1, $stats['licenses_created']);

        $user = User::query()->where('mobile', '09121111111')->first();
        $this->assertNotNull($user);
        $this->assertSame('علی تستی', $user->name);

        $this->assertDatabaseHas('course_accesses', [
            'user_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'active',
            'source' => 'import',
        ]);

        $this->assertDatabaseHas('spotplayer_licenses', [
            'user_id' => $user->id,
            'product_id' => $product->id,
            'license_key' => 'license-key-001',
            'status' => 'active',
        ]);

        $order = Order::query()->where('order_number', 'SP-test-license-1')->first();
        $this->assertNotNull($order);
        $this->assertSame('license-key-001', $order->spotplayer_license_code);
    }

    public function test_import_is_idempotent(): void
    {
        $product = Product::query()->create([
            'title' => 'دوره کمپین‌نویسی',
            'slug' => 'campaign-writing',
            'type' => 'normal',
            'price' => 1_990_000,
            'is_active' => true,
        ]);

        $csv = $this->makeCsv([
            [
                '_id' => 'test-license-2',
                'name' => 'سارا تستی',
                'course' => 'دوره پولساز کمپین نویسی پیشرفته',
                'watermark' => '09122222222',
                'create' => '46213.5',
                'activate' => '46213.6',
                'download' => '0',
                'watch' => '0',
                'key' => 'license-key-002',
                'all.x' => '1',
                'all.n' => '1',
            ],
        ]);

        $service = app(CampaignLicenseImportService::class);
        $service->import($csv, $product);
        $second = $service->import($csv, $product);

        $this->assertSame(0, $second['users_created']);
        $this->assertSame(0, $second['users_updated']);
        $this->assertSame(0, $second['course_access_created']);
        $this->assertSame(1, $second['course_access_existing']);
        $this->assertSame(0, $second['licenses_created']);
        $this->assertSame(1, $second['licenses_existing']);
        $this->assertSame(1, User::query()->where('mobile', '09122222222')->count());
        $this->assertSame(1, CourseAccess::query()->count());
        $this->assertSame(1, SpotplayerLicense::query()->count());
    }

    /** @param list<array<string, string>> $rows */
    private function makeCsv(array $rows): string
    {
        $path = tempnam(sys_get_temp_dir(), 'campaign-license-import-');
        $handle = fopen($path, 'w');
        $headers = ['_id', 'name', 'course', 'watermark', 'create', 'activate', 'download', 'watch', 'key', 'all.x', 'all.n'];
        fputcsv($handle, $headers);

        foreach ($rows as $row) {
            fputcsv($handle, array_map(fn ($header) => $row[$header] ?? '', $headers));
        }

        fclose($handle);

        return $path;
    }
}
