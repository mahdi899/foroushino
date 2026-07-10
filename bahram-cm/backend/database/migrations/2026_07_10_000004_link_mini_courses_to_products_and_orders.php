<?php

use App\Models\MiniCourse;
use App\Models\MiniCourseEnrollment;
use App\Models\Order;
use App\Models\User;
use App\Services\MiniCourseProductService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mini_courses', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('id')->constrained('products')->nullOnDelete();
        });

        Schema::table('mini_course_enrollments', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('user_id')->constrained('orders')->nullOnDelete();
        });

        $productService = app(MiniCourseProductService::class);

        MiniCourse::query()->each(function (MiniCourse $course) use ($productService) {
            $productService->syncProduct($course);
        });

        MiniCourseEnrollment::query()
            ->with(['miniCourse', 'user.profile'])
            ->whereNull('order_id')
            ->each(function (MiniCourseEnrollment $enrollment) use ($productService) {
                $course = $enrollment->miniCourse;
                $user = $enrollment->user;
                if (! $course || ! $user) {
                    return;
                }

                $productService->syncProduct($course);
                $course->refresh();

                if (! $course->product_id) {
                    return;
                }

                $orderNumber = $this->normalizeOrderNumber($enrollment->enrollment_number);

                $order = Order::query()->create([
                    'user_id' => $user->id,
                    'order_number' => $orderNumber,
                    'product_id' => $course->product_id,
                    'customer_name' => $this->customerName($user),
                    'customer_phone' => $user->mobile,
                    'customer_email' => $user->profile?->email,
                    'amount' => 0,
                    'discount_amount' => 0,
                    'final_amount' => 0,
                    'status' => 'fulfilled',
                    'payment_status' => 'paid',
                    'paid_at' => $enrollment->enrolled_at ?? now(),
                    'customer_extra_data' => [
                        'source' => 'mini_course_enrollment',
                        'mini_course_slug' => $course->slug,
                    ],
                ]);

                $enrollment->update([
                    'order_id' => $order->id,
                    'enrollment_number' => $order->order_number,
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('mini_course_enrollments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('order_id');
        });

        Schema::table('mini_courses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
        });
    }

    private function normalizeOrderNumber(string $existing): string
    {
        if (str_starts_with($existing, 'BC-')) {
            return Order::query()->where('order_number', $existing)->exists()
                ? $this->generateOrderNumber()
                : $existing;
        }

        return $this->generateOrderNumber();
    }

    private function generateOrderNumber(): string
    {
        do {
            $number = 'BC-'.now()->format('ymd').'-'.strtoupper(Str::random(5));
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }

    private function customerName(User $user): string
    {
        $user->loadMissing('profile');
        $name = trim(implode(' ', array_filter([
            $user->profile?->first_name,
            $user->profile?->last_name,
        ])));

        if ($name !== '') {
            return $name;
        }

        return trim((string) $user->name) !== '' ? (string) $user->name : Order::PLACEHOLDER_CUSTOMER_NAME;
    }
};
