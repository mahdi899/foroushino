<?php

namespace App\Services;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use App\Enums\SpotplayerLicenseStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Support\Mobile;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CampaignLicenseImportService
{
    /**
     * @return array{
     *     rows: int,
     *     users_created: int,
     *     users_updated: int,
     *     course_access_created: int,
     *     course_access_existing: int,
     *     orders_created: int,
     *     orders_existing: int,
     *     licenses_created: int,
     *     licenses_existing: int,
     *     skipped_invalid_phone: int,
     *     skipped_missing_key: int,
     *     skipped_duplicate_phone: int,
     * }
     */
    public function import(
        string $filePath,
        Product $product,
        bool $dryRun = false,
    ): array {
        $rows = $this->parseCsv($filePath);
        $stats = [
            'rows' => count($rows),
            'users_created' => 0,
            'users_updated' => 0,
            'course_access_created' => 0,
            'course_access_existing' => 0,
            'orders_created' => 0,
            'orders_existing' => 0,
            'licenses_created' => 0,
            'licenses_existing' => 0,
            'skipped_invalid_phone' => 0,
            'skipped_missing_key' => 0,
            'skipped_duplicate_phone' => 0,
        ];

        $processedPhones = [];

        $work = function () use ($rows, $product, &$stats, &$processedPhones, $dryRun): void {
            foreach ($rows as $row) {
                if (blank($row['license_key'])) {
                    $stats['skipped_missing_key']++;

                    continue;
                }

                $mobile = Mobile::normalize($row['mobile']);
                if (! $mobile) {
                    $stats['skipped_invalid_phone']++;

                    continue;
                }

                if (isset($processedPhones[$mobile])) {
                    $stats['skipped_duplicate_phone']++;
                }
                $processedPhones[$mobile] = true;

                $userResult = $this->upsertStudent($row, $mobile, $dryRun);
                $stats['users_created'] += $userResult['created'] ? 1 : 0;
                $stats['users_updated'] += $userResult['updated'] ? 1 : 0;

                $orderResult = $this->upsertOrder($product, $userResult['user_id'], $row, $mobile, $dryRun);
                $stats['orders_created'] += $orderResult['created'] ? 1 : 0;
                $stats['orders_existing'] += $orderResult['created'] ? 0 : 1;

                $accessResult = $this->upsertCourseAccess(
                    $product,
                    $userResult['user_id'],
                    $orderResult['order_id'],
                    $dryRun,
                );
                $stats['course_access_created'] += $accessResult['created'] ? 1 : 0;
                $stats['course_access_existing'] += $accessResult['created'] ? 0 : 1;

                $licenseResult = $this->upsertLicense(
                    $product,
                    $userResult['user_id'],
                    $orderResult['order_id'],
                    $accessResult['course_access_id'],
                    $row,
                    $dryRun,
                );
                $stats['licenses_created'] += $licenseResult['created'] ? 1 : 0;
                $stats['licenses_existing'] += $licenseResult['created'] ? 0 : 1;
            }
        };

        if ($dryRun) {
            $work();
        } else {
            DB::transaction($work);
        }

        return $stats;
    }

    /**
     * @return list<array{
     *     spotplayer_id: string,
     *     name: string,
     *     mobile: string,
     *     course: string,
     *     license_key: string,
     *     device_limit: ?int,
     *     created_at: ?Carbon,
     *     raw: array<string, string>,
     * }>
     */
    private function parseCsv(string $filePath): array
    {
        $handle = fopen($filePath, 'r');
        abort_if($handle === false, 500, 'فایل CSV قابل خواندن نیست.');

        $header = fgetcsv($handle);
        abort_if(! is_array($header), 500, 'سربرگ CSV نامعتبر است.');

        if (isset($header[0])) {
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]) ?? $header[0];
        }

        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) !== count($header)) {
                continue;
            }

            /** @var array<string, string> $data */
            $data = array_combine($header, $line);
            $mobile = trim($data['watermark'] ?? '');
            $name = trim($data['name'] ?? '');
            $licenseKey = trim($data['key'] ?? '');

            $rows[] = [
                'spotplayer_id' => trim($data['_id'] ?? ''),
                'name' => $name !== '' ? $name : Order::PLACEHOLDER_CUSTOMER_NAME,
                'mobile' => $mobile,
                'course' => trim($data['course'] ?? ''),
                'license_key' => $licenseKey,
                'device_limit' => filled($data['all.n'] ?? null) ? (int) $data['all.n'] : null,
                'created_at' => $this->parseExcelDate($data['create'] ?? null),
                'raw' => $data,
            ];
        }

        fclose($handle);

        return $rows;
    }

    /**
     * @param  array{name: string}  $row
     * @return array{user_id: int, created: bool, updated: bool}
     */
    private function upsertStudent(array $row, string $mobile, bool $dryRun): array
    {
        $existing = User::query()->where('mobile', $mobile)->first();

        if ($dryRun) {
            return [
                'user_id' => $existing?->id ?? 0,
                'created' => $existing === null,
                'updated' => $existing !== null,
            ];
        }

        if ($existing) {
            $updated = false;

            if ($row['name'] !== Order::PLACEHOLDER_CUSTOMER_NAME && $existing->name !== $row['name']) {
                $existing->update(['name' => $row['name']]);
                $updated = true;
            }

            return ['user_id' => $existing->id, 'created' => false, 'updated' => $updated];
        }

        $user = User::query()->create([
            'name' => $row['name'],
            'mobile' => $mobile,
            'status' => 'active',
            'is_admin' => false,
        ]);

        return ['user_id' => $user->id, 'created' => true, 'updated' => false];
    }

    /**
     * @param  array{
     *     spotplayer_id: string,
     *     name: string,
     *     license_key: string,
     *     created_at: ?Carbon,
     * }  $row
     * @return array{order_id: int, created: bool}
     */
    private function upsertOrder(Product $product, int $userId, array $row, string $mobile, bool $dryRun): array
    {
        $orderNumber = 'SP-'.($row['spotplayer_id'] !== '' ? $row['spotplayer_id'] : substr(sha1($row['license_key']), 0, 12));

        if ($dryRun || $userId === 0) {
            $exists = Order::query()->where('order_number', $orderNumber)->exists();

            return ['order_id' => 0, 'created' => ! $exists];
        }

        $order = Order::query()->firstOrCreate(
            ['order_number' => $orderNumber],
            [
                'user_id' => $userId,
                'product_id' => $product->id,
                'customer_name' => $row['name'],
                'customer_phone' => $mobile,
                'customer_extra_data' => [
                    'source' => 'spotplayer_import',
                    'spotplayer_id' => $row['spotplayer_id'],
                ],
                'amount' => $product->price,
                'discount_amount' => max($product->price - $product->effective_price, 0),
                'final_amount' => $product->effective_price,
                'status' => 'fulfilled',
                'payment_status' => 'paid',
                'spotplayer_license_code' => $row['license_key'],
                'paid_at' => $row['created_at'] ?? now(),
            ],
        );

        if (! $order->wasRecentlyCreated) {
            $order->update([
                'user_id' => $userId,
                'spotplayer_license_code' => $row['license_key'],
            ]);
        }

        return ['order_id' => $order->id, 'created' => $order->wasRecentlyCreated];
    }

    /** @return array{course_access_id: int, created: bool} */
    private function upsertCourseAccess(Product $product, int $userId, int $orderId, bool $dryRun): array
    {
        if ($dryRun || $userId === 0) {
            $exists = $userId > 0 && CourseAccess::query()
                ->where('user_id', $userId)
                ->where('product_id', $product->id)
                ->exists();

            return ['course_access_id' => 0, 'created' => ! $exists];
        }

        $access = CourseAccess::query()->firstOrCreate(
            ['user_id' => $userId, 'product_id' => $product->id],
            [
                'order_id' => $orderId ?: null,
                'status' => CourseAccessStatus::Active,
                'access_type' => 'lifetime',
                'source' => CourseAccessSource::Import,
                'activated_at' => now(),
            ],
        );

        if ($access->status !== CourseAccessStatus::Active) {
            $access->update([
                'status' => CourseAccessStatus::Active,
                'activated_at' => now(),
                'deactivated_at' => null,
            ]);
        }

        if ($orderId && blank($access->order_id)) {
            $access->update(['order_id' => $orderId]);
        }

        return ['course_access_id' => $access->id, 'created' => $access->wasRecentlyCreated];
    }

    /**
     * @param  array{
     *     spotplayer_id: string,
     *     license_key: string,
     *     device_limit: ?int,
     *     raw: array<string, string>,
     * }  $row
     * @return array{created: bool}
     */
    private function upsertLicense(
        Product $product,
        int $userId,
        int $orderId,
        int $courseAccessId,
        array $row,
        bool $dryRun,
    ): array {
        if ($dryRun || $userId === 0) {
            $exists = SpotplayerLicense::query()
                ->where('license_key', $row['license_key'])
                ->exists();

            return ['created' => ! $exists];
        }

        $rawResponse = array_merge($row['raw'], [
            '_id' => $row['spotplayer_id'],
            'key' => $row['license_key'],
        ]);

        $license = SpotplayerLicense::query()->updateOrCreate(
            ['license_key' => $row['license_key']],
            [
                'user_id' => $userId,
                'product_id' => $product->id,
                'order_id' => $orderId ?: null,
                'course_access_id' => $courseAccessId ?: null,
                'spotplayer_course_id' => $product->spotplayer_course_id,
                'device_limit' => $row['device_limit'],
                'status' => SpotplayerLicenseStatus::Active,
                'raw_response' => $rawResponse,
            ],
        );

        return ['created' => $license->wasRecentlyCreated];
    }

    private function parseExcelDate(mixed $value): ?Carbon
    {
        if ($value === null || $value === '' || ! is_numeric($value)) {
            return null;
        }

        $unix = ((float) $value - 25569) * 86400;

        return Carbon::createFromTimestampUTC((int) $unix);
    }
}
