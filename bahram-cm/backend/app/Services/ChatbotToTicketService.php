<?php

namespace App\Services;

use App\Enums\TicketTechEscalation;
use App\Exceptions\ChatbotTicketConversionException;
use App\Models\ChatbotLog;
use App\Models\ChatbotSession;
use App\Models\Ticket;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChatbotToTicketService
{
    private const DEPARTMENTS = ['technical', 'financial', 'course', 'general'];

    public function __construct(
        private readonly ChatbotService $chatbot,
    ) {}

    /**
     * @return array{ticket: Ticket, student: User}
     */
    public function convert(
        string $sessionId,
        string $subject,
        ?string $department,
        User $operator,
        ?string $operatorProfileId = null,
        ?string $mobileOverride = null,
    ): array {
        $subject = trim($subject);
        if ($subject === '' || mb_strlen($subject) > 255) {
            throw ValidationException::withMessages([
                'subject' => ['عنوان تیکت الزامی است و حداکثر ۲۵۵ کاراکتر باشد.'],
            ]);
        }

        if ($department !== null && $department !== '' && ! in_array($department, self::DEPARTMENTS, true)) {
            throw ValidationException::withMessages([
                'department' => ['دپارتمان نامعتبر است.'],
            ]);
        }

        $session = ChatbotSession::query()->where('session_id', $sessionId)->first();
        if (! $session) {
            throw new ChatbotTicketConversionException('session_not_found', 'نشست چت‌بات یافت نشد.', 404);
        }

        if ($session->ticket_id) {
            throw new ChatbotTicketConversionException(
                'already_converted',
                'این گفتگو قبلاً به تیکت تبدیل شده است.',
            );
        }

        $phone = Mobile::normalize($session->visitor_phone)
            ?: Mobile::normalize($mobileOverride);

        if (! $phone) {
            throw new ChatbotTicketConversionException(
                'phone_required',
                'برای تبدیل به تیکت، شماره موبایل مخاطب لازم است.',
            );
        }

        $student = User::query()
            ->where('mobile', $phone)
            ->where('is_admin', false)
            ->first();

        if (! $student) {
            throw new ChatbotTicketConversionException(
                'student_not_found',
                'دانشجویی با این شماره موبایل در سایت ثبت‌نام نکرده است.',
            );
        }

        if (! $session->visitor_phone) {
            $session->visitor_phone = $phone;
            $session->save();
        }

        $storedDepartment = $department === 'general' || $department === '' || $department === null
            ? null
            : $department;

        $profile = $operatorProfileId
            ? $this->chatbot->resolveOperatorProfile($operatorProfileId)
            : null;

        if ($operatorProfileId && $operatorProfileId !== '' && $profile === null) {
            throw ValidationException::withMessages([
                'operator_profile_id' => ['پروفایل اپراتور نامعتبر است.'],
            ]);
        }

        $ticket = DB::transaction(function () use (
            $session,
            $student,
            $subject,
            $storedDepartment,
            $operator,
            $profile,
            $sessionId,
        ) {
            $ticket = $student->tickets()->create([
                'department' => $storedDepartment,
                'tech_escalation' => $storedDepartment === 'technical'
                    ? TicketTechEscalation::TechSupport
                    : null,
                'subject' => $subject,
                'status' => 'waiting_user',
                'priority' => 'normal',
            ]);

            $ticket->messages()->create([
                'user_id' => $operator->id,
                'message' => "این تیکت از گفتگوی چت‌بات ساخته شد. شناسه نشست: {$sessionId}",
                'is_admin_reply' => true,
            ]);

            $session->ticket_id = $ticket->id;
            $session->converted_at = now();
            $session->save();

            $this->clearPendingOperatorMessages($sessionId);

            $guide = "گفتگو به تیکت پشتیبانی شماره {$ticket->id} منتقل شد. لطفاً ادامهٔ پیگیری را از پنل پشتیبانی (بخش تیکت‌ها) انجام دهید.";

            $this->chatbot->postOperatorReply(
                $sessionId,
                $guide,
                (int) $operator->id,
                $operator->name ?? $operator->email ?? 'اپراتور',
                null,
                $profile,
            );

            return $ticket;
        });

        $ticket->load(['user', 'messages.user', 'techResolver']);

        app(SmsService::class)->sendTicketReply($ticket);
        app(InAppNotificationService::class)->ticketReply($ticket);
        app(AdminTelegramLogService::class)->notifyTicketAdminReply(
            $ticket,
            "این تیکت از گفتگوی چت‌بات ساخته شد. شناسه نشست: {$sessionId}",
        );

        return ['ticket' => $ticket, 'student' => $student];
    }

    private function clearPendingOperatorMessages(string $sessionId): void
    {
        $logs = ChatbotLog::query()
            ->where('session_id', $sessionId)
            ->where('metadata->event', 'visitor_message')
            ->where('metadata->pending_operator', true)
            ->get();

        foreach ($logs as $log) {
            $meta = is_array($log->metadata) ? $log->metadata : [];
            $meta['pending_operator'] = false;
            $log->metadata = $meta;
            $log->save();
        }
    }
}
