<?php

namespace App\Actions\Identity;

use App\Models\User;
use App\Services\AdminAuditLogger;
use App\Support\SensitiveData;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RevealStudentMobile
{
    public function __construct(private readonly AdminAuditLogger $audit) {}

    /**
     * @return array{id: int, mobile: string, mobile_masked: ?string}
     */
    public function __invoke(User $actor, User $student): array
    {
        if (! $actor->hasPermission('students.view_full_mobile')) {
            throw new HttpException(403, 'Forbidden');
        }

        if ($student->is_admin) {
            throw new HttpException(404, 'Not found');
        }

        $key = 'identity-reveal:mobile:'.$actor->id;
        if (RateLimiter::tooManyAttempts($key, 30)) {
            throw new HttpException(429, 'تعداد درخواست‌ها بیش از حد مجاز است.');
        }
        RateLimiter::hit($key, 60);

        $this->audit->log($actor, 'student.mobile_revealed', $student, [
            'student_id' => $student->id,
        ]);

        return [
            'id' => $student->id,
            'mobile' => (string) $student->mobile,
            'mobile_masked' => SensitiveData::maskMobile($student->mobile),
        ];
    }
}
