<?php

namespace App\Services;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use App\Models\CourseAccess;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Bulk student import from a CSV file (exported from Excel), with a
 * dry-run preview step before anything is written to the database.
 *
 * Expected columns (header row, order-independent): mobile, name,
 * product_id (optional — grants course access when present).
 */
class StudentImportService
{
    /**
     * @return array{rows: array<int, array<string, mixed>>, valid_count: int, error_count: int}
     */
    public function preview(UploadedFile $file): array
    {
        return $this->process($file, commit: false);
    }

    /**
     * @return array{rows: array<int, array<string, mixed>>, valid_count: int, error_count: int}
     */
    public function commit(UploadedFile $file): array
    {
        return DB::transaction(fn () => $this->process($file, commit: true));
    }

    /**
     * @return array{rows: array<int, array<string, mixed>>, valid_count: int, error_count: int}
     */
    private function process(UploadedFile $file, bool $commit): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        abort_if($handle === false, 422, 'فایل قابل خواندن نیست.');

        // Strip a UTF-8 BOM if present so headers match exactly.
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $header = fgetcsv($handle);
        abort_if($header === false, 422, 'فایل خالی است.');

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);
        $rows = [];
        $validCount = 0;
        $errorCount = 0;
        $lineNumber = 1;

        while (($line = fgetcsv($handle)) !== false) {
            $lineNumber++;
            $record = array_combine($header, array_pad($line, count($header), null));

            $mobile = Mobile::normalize($record['mobile'] ?? null);
            $name = trim((string) ($record['name'] ?? '')) ?: null;
            $productId = filled($record['product_id'] ?? null) ? (int) $record['product_id'] : null;

            $errors = [];
            if (! $mobile) {
                $errors[] = 'شماره موبایل نامعتبر است.';
            }

            $status = empty($errors) ? 'ok' : 'error';
            $status === 'ok' ? $validCount++ : $errorCount++;

            if ($commit && $status === 'ok') {
                $user = User::query()->firstOrCreate(
                    ['mobile' => $mobile],
                    ['name' => $name ?? 'دانشجو', 'status' => 'active']
                );

                if ($name && $user->wasRecentlyCreated === false && blank($user->name)) {
                    $user->update(['name' => $name]);
                }

                if ($productId) {
                    CourseAccess::query()->updateOrCreate(
                        ['user_id' => $user->id, 'product_id' => $productId],
                        ['status' => CourseAccessStatus::Active, 'access_type' => 'lifetime', 'source' => CourseAccessSource::Import, 'activated_at' => now()]
                    );
                }
            }

            $rows[] = [
                'line' => $lineNumber,
                'mobile' => $record['mobile'] ?? null,
                'name' => $name,
                'product_id' => $productId,
                'status' => $status,
                'errors' => $errors,
            ];
        }

        fclose($handle);

        return ['rows' => $rows, 'valid_count' => $validCount, 'error_count' => $errorCount];
    }
}
