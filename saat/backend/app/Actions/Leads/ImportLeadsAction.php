<?php

namespace App\Actions\Leads;

use App\Enums\ImportStatus;
use App\Enums\LeadStatus;
use App\Models\ImportBatch;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Parses uploaded CSV rows into leads, normalising phone numbers and
 * flagging rows that already exist in the system as duplicates rather
 * than silently dropping or re-queuing them.
 */
class ImportLeadsAction
{
    /**
     * @param  array<int, array<string, mixed>>  $rows  Each row keyed by column name
     *                                                    (first_name,last_name,phone,city,source,product_id).
     */
    public function execute(array $rows, User $createdBy, ?string $sourceFilename = null): ImportBatch
    {
        $batch = ImportBatch::query()->create([
            'created_by' => $createdBy->id,
            'source_filename' => $sourceFilename,
            'total_rows' => count($rows),
            'status' => ImportStatus::Processing,
        ]);

        $imported = 0;
        $duplicates = 0;
        $errors = [];

        DB::transaction(function () use ($rows, $batch, &$imported, &$duplicates, &$errors): void {
            foreach ($rows as $index => $row) {
                $phone = $this->normalizePhone((string) ($row['phone'] ?? ''));

                if ($phone === '' || empty($row['first_name'])) {
                    $errors[] = ['row' => $index + 1, 'reason' => 'نام یا شماره تلفن خالی است.'];

                    continue;
                }

                $existing = Lead::query()->where('normalized_phone', $phone)->first();

                $lead = Lead::query()->create([
                    'first_name' => $row['first_name'],
                    'last_name' => $row['last_name'] ?? '',
                    'phone' => $row['phone'],
                    'normalized_phone' => $phone,
                    'city' => $row['city'] ?? null,
                    'source' => $row['source'] ?? 'excel',
                    'product_id' => $row['product_id'] ?? null,
                    'campaign_id' => $row['campaign_id'] ?? null,
                    'status' => $existing ? LeadStatus::Duplicate : LeadStatus::New,
                    'duplicate_of_id' => $existing?->id,
                    'import_batch_id' => $batch->id,
                ]);

                if ($existing) {
                    $duplicates++;
                } else {
                    $imported++;
                }
            }
        });

        $batch->update([
            'imported_count' => $imported,
            'duplicate_count' => $duplicates,
            'error_count' => count($errors),
            'errors' => $errors,
            'status' => ImportStatus::Completed,
        ]);

        return $batch->fresh();
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) > 10) {
            $digits = '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0'.$digits;
        }

        return $digits;
    }
}
