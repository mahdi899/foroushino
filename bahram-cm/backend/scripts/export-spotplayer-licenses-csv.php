<?php

/**
 * One-off helper: export valid SpotPlayer license rows from the panel XLSX
 * into a local CSV (never commit license CSVs — they contain customer keys/PII).
 *
 * Usage: php scripts/export-spotplayer-licenses-csv.php path-to.xlsx [output.csv]
 */

$source = $argv[1] ?? null;
$target = $argv[2] ?? (sys_get_temp_dir().DIRECTORY_SEPARATOR.'spotplayer-licenses-export.csv');

if (! is_string($source) || $source === '' || ! is_file($source)) {
    fwrite(STDERR, "Usage: php scripts/export-spotplayer-licenses-csv.php path-to.xlsx [output.csv]\n");
    exit(1);
}

$zip = new ZipArchive();
if ($zip->open($source) !== true) {
    fwrite(STDERR, "Could not open XLSX: {$source}\n");
    exit(1);
}

$sharedStrings = [];
$ssXml = $zip->getFromName('xl/sharedStrings.xml');
if ($ssXml) {
    $ss = simplexml_load_string($ssXml);
    foreach ($ss->si as $si) {
        if (isset($si->t)) {
            $sharedStrings[] = (string) $si->t;
        } else {
            $parts = [];
            foreach ($si->r as $r) {
                $parts[] = (string) $r->t;
            }
            $sharedStrings[] = implode('', $parts);
        }
    }
}

$sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
$sheet = simplexml_load_string($sheetXml);
$rows = [];
foreach ($sheet->sheetData->row as $row) {
    $line = [];
    foreach ($row->c as $cell) {
        $ref = (string) $cell['r'];
        preg_match('/([A-Z]+)/', $ref, $m);
        $col = $m[1];
        $type = (string) ($cell['t'] ?? '');
        $value = isset($cell->v) ? (string) $cell->v : '';
        if ($type === 's') {
            $value = $sharedStrings[(int) $value] ?? '';
        }
        $line[$col] = $value;
    }
    $rows[] = $line;
}

$headerRow = $rows[0] ?? [];
ksort($headerRow);
$headers = array_values($headerRow);

$handle = fopen($target, 'w');
if ($handle === false) {
    fwrite(STDERR, "Could not write CSV: {$target}\n");
    exit(1);
}

fputcsv($handle, $headers);
$written = 0;

for ($i = 1; $i < count($rows); $i++) {
    $row = $rows[$i];
    ksort($row);
    $vals = array_values($row);
    $record = array_combine($headers, array_pad($vals, count($headers), ''));
    if (trim($record['watermark'] ?? '') === '' || trim($record['name'] ?? '') === '' || trim($record['key'] ?? '') === '') {
        continue;
    }

    fputcsv($handle, array_map(fn ($h) => $record[$h] ?? '', $headers));
    $written++;
}

fclose($handle);

echo "Wrote {$written} rows to {$target}\n";
echo "Do not commit this file — import with: php artisan campaign:import-licenses {$target}\n";
