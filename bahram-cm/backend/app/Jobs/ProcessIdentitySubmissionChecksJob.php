<?php

namespace App\Jobs;

use App\Actions\Identity\SubmitIdentityVerification;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Support\NationalCode;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/** PersonInfo + SMS after identity submit — Shahkar stays synchronous for instant mismatch feedback. */
class ProcessIdentitySubmissionChecksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $backoff = 15;

    public function __construct(public int $submissionId) {}

    public function handle(SubmitIdentityVerification $submit): void
    {
        $submission = IdentityVerificationSubmission::query()->find($this->submissionId);
        if (! $submission) {
            return;
        }

        $user = User::query()->find($submission->user_id);
        if (! $user) {
            return;
        }

        $nationalCode = NationalCode::decrypt($submission->national_code_encrypted);
        if (! $nationalCode) {
            return;
        }

        $data = [
            'first_name' => $submission->first_name,
            'last_name' => $submission->last_name,
            'date_of_birth' => $submission->date_of_birth?->toDateString() ?? '',
            'gender' => $submission->gender ?? '',
            'city' => $submission->city ?? '',
            'expected_video_text' => $submission->expected_video_text,
        ];

        $submit->runPostSubmitChecks($submission, $user, $nationalCode, $data);
    }
}
