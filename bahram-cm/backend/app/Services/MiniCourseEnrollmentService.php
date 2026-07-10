<?php

namespace App\Services;

use App\Models\MiniCourse;
use App\Models\MiniCourseEnrollment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MiniCourseEnrollmentService
{
    public function __construct(
        private readonly MiniCourseProductService $products,
        private readonly InAppNotificationService $notifications,
    ) {}

    public function enroll(User $user, MiniCourse $course): MiniCourseEnrollment
    {
        return DB::transaction(function () use ($user, $course) {
            $existing = MiniCourseEnrollment::query()
                ->where('user_id', $user->id)
                ->where('mini_course_id', $course->id)
                ->first();

            if ($existing) {
                return $existing;
            }

            $this->products->syncProduct($course);
            $course->refresh();

            $order = $this->createFreeOrder($user, $course);

            $enrollment = MiniCourseEnrollment::query()->create([
                'mini_course_id' => $course->id,
                'user_id' => $user->id,
                'order_id' => $order->id,
                'enrollment_number' => $order->order_number,
                'enrolled_at' => now(),
            ]);

            $this->notifications->miniCourseEnrolled($user, $course, $order);

            return $enrollment;
        });
    }

    public function isEnrolled(User $user, MiniCourse $course): bool
    {
        return MiniCourseEnrollment::query()
            ->where('user_id', $user->id)
            ->where('mini_course_id', $course->id)
            ->exists();
    }

    private function createFreeOrder(User $user, MiniCourse $course): Order
    {
        $user->loadMissing('profile');

        $name = trim(implode(' ', array_filter([
            $user->profile?->first_name,
            $user->profile?->last_name,
        ])));

        if ($name === '') {
            $name = trim((string) $user->name) !== '' ? (string) $user->name : Order::PLACEHOLDER_CUSTOMER_NAME;
        }

        return Order::query()->create([
            'user_id' => $user->id,
            'order_number' => $this->generateOrderNumber(),
            'product_id' => $course->product_id,
            'customer_name' => $name,
            'customer_phone' => $user->mobile,
            'customer_email' => $user->profile?->email,
            'amount' => 0,
            'discount_amount' => 0,
            'final_amount' => 0,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'paid_at' => now(),
            'customer_extra_data' => [
                'source' => 'mini_course_enrollment',
                'mini_course_slug' => $course->slug,
            ],
        ]);
    }

    private function generateOrderNumber(): string
    {
        do {
            $number = 'BC-'.now()->format('ymd').'-'.strtoupper(Str::random(5));
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }
}
