<?php

namespace App\Services;

use App\Models\MiniCourse;
use App\Models\MiniCourseEnrollment;
use App\Models\User;
use Illuminate\Support\Str;

class MiniCourseEnrollmentService
{
    public function enroll(User $user, MiniCourse $course): MiniCourseEnrollment
    {
        return MiniCourseEnrollment::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'mini_course_id' => $course->id,
            ],
            [
                'enrollment_number' => $this->generateEnrollmentNumber(),
                'enrolled_at' => now(),
            ],
        );
    }

    public function isEnrolled(User $user, MiniCourse $course): bool
    {
        return MiniCourseEnrollment::query()
            ->where('user_id', $user->id)
            ->where('mini_course_id', $course->id)
            ->exists();
    }

    private function generateEnrollmentNumber(): string
    {
        do {
            $number = 'MC-'.now()->format('ymd').'-'.strtoupper(Str::random(5));
        } while (MiniCourseEnrollment::query()->where('enrollment_number', $number)->exists());

        return $number;
    }
}
