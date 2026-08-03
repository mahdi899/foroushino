<?php

namespace App\Exports;

use App\Models\Order;
use Generator;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromGenerator;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class OrdersExport implements FromGenerator, WithColumnFormatting, WithColumnWidths, WithHeadings, WithStyles
{
    public function __construct(private readonly Builder $query) {}

    public function headings(): array
    {
        return [
            'شماره سفارش',
            'محصول',
            'نوع محصول',
            'مشتری',
            'تلفن',
            'ایمیل',
            'مبلغ (تومان)',
            'وضعیت',
            'کد لایسنس',
            'زمان ارسال پیامک',
            'زمان پرداخت',
            'تاریخ ثبت',
        ];
    }

    public function generator(): Generator
    {
        foreach ($this->query->cursor() as $order) {
            /** @var Order $order */
            yield [
                $order->order_number,
                $order->product?->title,
                $this->productTypeLabel($order->product?->type),
                $order->customer_name,
                $order->customer_phone,
                $order->customer_email,
                $this->displayAmount($order),
                $this->statusLabel($order->status),
                $order->spotplayer_license_code,
                $order->sms_sent_at?->format('Y-m-d H:i:s'),
                $order->paid_at?->format('Y-m-d H:i:s'),
                $order->created_at?->format('Y-m-d H:i:s'),
            ];
        }
    }

  /** @return array<string, float> */
    public function columnWidths(): array
    {
        return [
            'A' => 18,
            'B' => 36,
            'C' => 18,
            'D' => 22,
            'E' => 14,
            'F' => 28,
            'G' => 16,
            'H' => 18,
            'I' => 24,
            'J' => 20,
            'K' => 20,
            'L' => 20,
        ];
    }

  /** @return array<string, string> */
    public function columnFormats(): array
    {
        return [
            'A' => NumberFormat::FORMAT_TEXT,
            'E' => NumberFormat::FORMAT_TEXT,
            'G' => '#,##0',
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

    private function displayAmount(Order $order): int
    {
        $final = (int) $order->final_amount;
        $list = (int) $order->amount;

        return $final > 0 ? $final : $list;
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'pending_payment' => 'در انتظار پرداخت',
            'paid' => 'پرداخت‌شده',
            'fulfilled' => 'تحویل داده‌شده',
            'failed' => 'ناموفق',
            'cancelled' => 'لغوشده',
            default => $status,
        };
    }

    private function productTypeLabel(?string $type): ?string
    {
        return match ($type) {
            'package' => 'پکیج',
            'normal' => 'عادی',
            'course_spotplayer' => 'دوره SpotPlayer',
            'manual_service' => 'خدمت دستی',
            'event' => 'رویداد',
            default => $type,
        };
    }
}
