<?php

namespace App\Actions\Identity;

use App\Models\User;
use App\Services\AdminAuditLogger;
use App\Support\NationalCode;
use App\Support\SensitiveData;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RevealNationalCode
{
    public function __construct(private readonly AdminAuditLogger $audit) {}

    /**
     * @return array{id: int, national_code: string, national_code_masked: ?string}
     */
    public function __invoke(User $actor, User $student): array
    {
        if (! $actor->hasPermission('identity.view_national_code')) {
            throw new HttpException(403, 'Forbidden');
        }

        if ($student->is_admin) {
            throw new HttpException(404, 'Not found');
        }

        $key = 'identity-reveal:national:'.$actor->id;
        if (RateLimiter::tooManyAttempts($key, 20)) {
            throw new HttpException(429, 'تعداد درخواست‌ها بیش از حد مجاز است.');
        }
        RateLimiter::hit($key, 60);

        $profile = $student->identityProfile;
        if (! $profile || blank($profile->national_code_encrypted)) {
            throw new HttpException(404, 'کد ملی ثبت نشده است.');
        }

        $plain = NationalCode::decrypt($profile->national_code_encrypted);
        if (! $plain) {
            throw new HttpException(404, 'کد ملی ثبت نشده است.');
        }

        $this->audit->log($actor, 'student.national_code_revealed', $student, [
            'student_id' => $student->id,
        ]);

        return [
            'id' => $student->id,
            'national_code' => $plain,
            'national_code_masked' => SensitiveData::maskNationalCode($plain),
        ];
    }
}
