<?php

namespace App\Exports;

use App\Models\Lead;
use Generator;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromGenerator;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LandingPageSubmissionsExport implements FromGenerator, WithColumnFormatting, WithColumnWidths, WithHeadings, WithStyles
{
    public function __construct(private readonly Builder $query) {}

    public function headings(): array
    {
        return [
            'نام',
            'شماره تماس',
            'ایمیل',
            'توضیحات',
            'تاریخ ثبت',
        ];
    }

    public function generator(): Generator
    {
        foreach ($this->query->cursor() as $lead) {
            /** @var Lead $lead */
            yield [
                $lead->name,
                $lead->phone,
                $lead->email,
                $lead->message,
                $lead->created_at?->format('Y-m-d H:i:s'),
            ];
        }
    }

    /** @return array<string, float> */
    public function columnWidths(): array
    {
        return [
            'A' => 24,
            'B' => 16,
            'C' => 28,
            'D' => 40,
            'E' => 20,
        ];
    }

    /** @return array<string, string> */
    public function columnFormats(): array
    {
        return [
            'B' => NumberFormat::FORMAT_TEXT,
            'C' => NumberFormat::FORMAT_TEXT,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->setRightToLeft(true);

        return [
            1 => [
                'font' => ['bold' => true],
                'alignment' => [
                    'horizontal' => 'center',
                    'vertical' => 'center',
                    'wrapText' => true,
                ],
            ],
        ];
    }
}
