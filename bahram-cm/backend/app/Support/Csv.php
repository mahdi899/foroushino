<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Minimal CSV streaming helper used for the "simple CSV export" admin
 * actions (leads, orders) without pulling in a full spreadsheet library.
 */
class Csv
{
    /**
     * @param  array<int, string>  $headings
     * @param  iterable<int, array<int, mixed>>  $rows
     */
    public static function download(string $filename, array $headings, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headings, $rows) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM so Excel opens Persian text correctly.
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, $headings);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
