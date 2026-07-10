<?php

namespace App\Services;

use App\Enums\SeminarAttendanceStatus;
use App\Models\Order;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Support\Mobile;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SeminarOrderImportService
{
    /**
     * @return array{
     *     rows: int,
     *     users_created: int,
     *     users_updated: int,
     *     attendees_created: int,
     *     attendees_existing: int,
     *     orders_created: int,
     *     orders_existing: int,
     *     skipped_duplicate_phone: int,
     *     skipped_invalid_phone: int,
     *     skipped_item_mismatch: int,
     *     final_attendee_count: int,
     *     capacity_set_to: int|null,
     * }
     */
    public function import(
        string $filePath,
        Seminar $seminar,
        bool $dryRun = false,
        bool $markFull = true,
        ?string $expectedItemName = null,
    ): array {
        $seminar->loadMissing('product');
        abort_if(! $seminar->product_id, 500, 'سمینار به محصول متصل نیست.');

        $rows = $this->parseCsv($filePath);
        $stats = [
            'rows' => count($rows),
            'users_created' => 0,
            'users_updated' => 0,
            'attendees_created' => 0,
            'attendees_existing' => 0,
            'orders_created' => 0,
            'orders_existing' => 0,
            'skipped_duplicate_phone' => 0,
            'skipped_invalid_phone' => 0,
            'skipped_item_mismatch' => 0,
            'final_attendee_count' => 0,
            'capacity_set_to' => null,
        ];

        $processedPhones = [];

        $work = function () use ($rows, $seminar, $expectedItemName, &$stats, &$processedPhones, $dryRun, $markFull): void {
            foreach ($rows as $row) {
                if ($expectedItemName && filled($row['item_name']) && $row['item_name'] !== $expectedItemName) {
                    $stats['skipped_item_mismatch']++;

                    continue;
                }

                $mobile = Mobile::normalize($row['phone']);
                if (! $mobile) {
                    $stats['skipped_invalid_phone']++;

                    continue;
                }

                $isDuplicatePhone = isset($processedPhones[$mobile]);
                $userId = 0;

                if ($isDuplicatePhone) {
                    $stats['skipped_duplicate_phone']++;
                    $userId = (int) (User::query()->where('mobile', $mobile)->value('id') ?? 0);
                } else {
                    $processedPhones[$mobile] = true;

                    $userResult = $this->upsertStudent($row, $mobile, $dryRun);
                    $userId = $userResult['user_id'];
                    $stats['users_created'] += $userResult['created'] ? 1 : 0;
                    $stats['users_updated'] += $userResult['updated'] ? 1 : 0;

                    $attendeeResult = $this->registerAttendee($seminar, $userId, $dryRun);
                    $stats['attendees_created'] += $attendeeResult['created'] ? 1 : 0;
                    $stats['attendees_existing'] += $attendeeResult['created'] ? 0 : 1;
                }

                $orderResult = $this->upsertOrder($seminar, $userId, $row, $mobile, $dryRun);
                $stats['orders_created'] += $orderResult['created'] ? 1 : 0;
                $stats['orders_existing'] += $orderResult['created'] ? 0 : 1;
            }

            if ($markFull && ! $dryRun) {
                $seminar->refresh();
                $count = $seminar->registeredCount();
                $seminar->update(['capacity' => $count]);
                $stats['capacity_set_to'] = $count;
                $stats['final_attendee_count'] = $count;
            } elseif (! $dryRun) {
                $stats['final_attendee_count'] = $seminar->registeredCount();
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
     *     woo_order_number: string,
     *     phone: string,
     *     first_name: string,
     *     last_name: string,
     *     full_name: string,
     *     email: ?string,
     *     item_name: string,
     *     order_date: ?Carbon,
     *     amount: int,
     *     discount_amount: int,
     *     final_amount: int,
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
            $phone = trim($data['Phone (Billing)'] ?? '') ?: trim($data['Phone (Shipping)'] ?? '');
            $firstName = trim($data['First Name (Billing)'] ?? '');
            $lastName = trim($data['Last Name (Billing)'] ?? '');
            $fullName = trim($firstName.' '.$lastName);

            $orderDate = filled($data['Order Date'] ?? null)
                ? Carbon::parse($data['Order Date'])
                : null;

            $amount = $this->parseAmount($data['Order Subtotal Amount'] ?? $data['Order Total Amount'] ?? '0');
            $finalAmount = $this->parseAmount($data['Order Total Amount'] ?? '0');
            $discountAmount = max($amount - $finalAmount, $this->parseAmount($data['Discount Amount'] ?? '0'));

            $rows[] = [
                'woo_order_number' => trim((string) ($data['Order Number'] ?? '')),
                'phone' => $phone,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'full_name' => $fullName !== '' ? $fullName : Order::PLACEHOLDER_CUSTOMER_NAME,
                'email' => filled($data['Email (Billing)'] ?? null) ? trim($data['Email (Billing)']) : null,
                'item_name' => trim($data['Item Name'] ?? ''),
                'order_date' => $orderDate,
                'amount' => $amount,
                'discount_amount' => $discountAmount,
                'final_amount' => $finalAmount,
            ];
        }

        fclose($handle);

        return $rows;
    }

    /**
     * @param  array{first_name: string, last_name: string, full_name: string, email: ?string}  $row
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

            if ($row['full_name'] !== Order::PLACEHOLDER_CUSTOMER_NAME && $existing->name !== $row['full_name']) {
                $existing->update(['name' => $row['full_name']]);
                $updated = true;
            }

            if ($row['email'] && blank($existing->email)) {
                $existing->update(['email' => $row['email']]);
                $updated = true;
            }

            $existing->profile()->updateOrCreate(
                ['user_id' => $existing->id],
                array_filter([
                    'first_name' => $row['first_name'] ?: null,
                    'last_name' => $row['last_name'] ?: null,
                    'email' => $row['email'],
                ], fn ($value) => $value !== null && $value !== ''),
            );

            return ['user_id' => $existing->id, 'created' => false, 'updated' => $updated];
        }

        $user = User::query()->create([
            'name' => $row['full_name'],
            'mobile' => $mobile,
            'email' => $row['email'],
            'status' => 'active',
            'is_admin' => false,
        ]);

        $user->profile()->create(array_filter([
            'first_name' => $row['first_name'] ?: null,
            'last_name' => $row['last_name'] ?: null,
            'email' => $row['email'],
        ], fn ($value) => $value !== null && $value !== ''));

        return ['user_id' => $user->id, 'created' => true, 'updated' => false];
    }

    /** @return array{created: bool} */
    private function registerAttendee(Seminar $seminar, int $userId, bool $dryRun): array
    {
        if ($dryRun || $userId === 0) {
            $exists = $userId > 0 && SeminarAttendee::query()
                ->where('seminar_id', $seminar->id)
                ->where('user_id', $userId)
                ->exists();

            return ['created' => ! $exists];
        }

        $attendee = SeminarAttendee::query()->firstOrCreate(
            ['seminar_id' => $seminar->id, 'user_id' => $userId],
            ['attendance_status' => SeminarAttendanceStatus::Registered],
        );

        return ['created' => $attendee->wasRecentlyCreated];
    }

    /**
     * @param  array{
     *     woo_order_number: string,
     *     full_name: string,
     *     email: ?string,
     *     order_date: ?Carbon,
     *     amount: int,
     *     discount_amount: int,
     *     final_amount: int,
     * }  $row
     * @return array{created: bool}
     */
    private function upsertOrder(Seminar $seminar, int $userId, array $row, string $mobile, bool $dryRun): array
    {
        $orderNumber = 'WC-'.($row['woo_order_number'] !== '' ? $row['woo_order_number'] : uniqid());

        if ($dryRun || $userId === 0) {
            $exists = Order::query()->where('order_number', $orderNumber)->exists();

            return ['created' => ! $exists];
        }

        $order = Order::query()->firstOrCreate(
            ['order_number' => $orderNumber],
            [
                'user_id' => $userId,
                'product_id' => $seminar->product_id,
                'customer_name' => $row['full_name'],
                'customer_phone' => $mobile,
                'customer_email' => $row['email'],
                'customer_extra_data' => [
                    'source' => 'woocommerce_import',
                    'woo_order_number' => $row['woo_order_number'],
                ],
                'amount' => $row['amount'],
                'discount_amount' => $row['discount_amount'],
                'final_amount' => $row['final_amount'],
                'status' => 'fulfilled',
                'payment_status' => 'paid',
                'paid_at' => $row['order_date'] ?? now(),
            ],
        );

        if (! $order->wasRecentlyCreated && blank($order->user_id)) {
            $order->update(['user_id' => $userId]);
        }

        return ['created' => $order->wasRecentlyCreated];
    }

    private function parseAmount(string|int|float|null $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        return (int) round((float) str_replace(',', '', (string) $value));
    }
}
