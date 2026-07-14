<?php

namespace App\Actions\Calls;

use App\Enums\ActivityKind;
use App\Enums\CallResult;
use App\Enums\FollowupKind;
use App\Enums\FollowupStatus;
use App\Enums\LeadStatus;
use App\Enums\NextAction;
use App\Enums\NotificationKind;
use App\Enums\RoleName;
use App\Enums\SaleStatus;
use App\Events\CallResultSubmitted;
use App\Models\Call;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\LeadStatusHistory;
use App\Models\Sale;
use App\Models\User;
use App\Services\AchievementService;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use App\Services\Quality\QaSampler;
use App\Support\ResultRouting;
use Illuminate\Support\Facades\DB;

class SubmitCallResultAction
{
    private const POINTS_PER_CALL = 2;

    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ActivityLogService $activity,
        private readonly AchievementService $achievements,
        private readonly QaSampler $qaSampler,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array{call: Call, lead: Lead, follow_up: ?FollowUp, sale: ?Sale, next_action: NextAction}
     */
    public function execute(Call $call, array $data): array
    {
        // Idempotent: a result was already recorded for this call, replay it as-is.
        if ($call->result !== null) {
            $lead = $call->lead;

            return [
                'call' => $call,
                'lead' => $lead,
                'follow_up' => $lead->followUps()->where('created_from_call_id', $call->id)->first(),
                'sale' => $lead->sales()->latest()->first(),
                'next_action' => ResultRouting::nextActionFor($call->result),
            ];
        }

        return DB::transaction(function () use ($call, $data) {
            $result = CallResult::from($data['result']);
            $nextAction = ResultRouting::nextActionFor($result);
            $nextStatus = ResultRouting::leadStatusFor($result);

            $call->fill([
                'result' => $result,
                'note' => $data['note'] ?? null,
                'duration_sec' => $data['duration_sec'] ?? 0,
                'objection' => $data['objection'] ?? null,
                'ended_at' => now(),
                'state' => \App\Enums\CallState::Dispositioned,
            ])->save();

            /** @var Lead $lead */
            $lead = $call->lead()->lockForUpdate()->first();
            $agent = $call->agent;

            $lead->status = $nextStatus;
            $lead->last_call_at = now();
            $lead->call_count += 1;
            $lead->locked_by = null;
            $lead->locked_until = null;
            if (isset($data['note'])) {
                $lead->last_note = $data['note'];
            }
            if (isset($data['objection'])) {
                $lead->objection = $data['objection'];
            }
            if (isset($data['rating'])) {
                $lead->rating = $data['rating'];
            }

            $followUp = null;
            $sale = null;

            switch ($nextAction) {
                case NextAction::CreateFollowUp:
                case NextAction::ScheduleConsultation:
                    $followUp = $this->createFollowUp($lead, $agent, $call, $data, $nextAction);
                    $lead->next_followup_at = $followUp->due_at;
                    break;

                case NextAction::ScheduleRetry:
                    if ($nextStatus === LeadStatus::FollowUpRequired) {
                        $followUp = $this->createFollowUp($lead, $agent, $call, $data, $nextAction);
                        $lead->next_followup_at = $followUp->due_at;
                    } else {
                        $lead->next_followup_at = null;
                    }
                    break;

                case NextAction::CreatePaymentPendingSale:
                    $sale = $this->createSale($lead, $agent, $data, SaleStatus::PaymentPending);
                    $lead->next_followup_at = null;
                    break;

                case NextAction::CreateSalePendingConfirmation:
                    $sale = $this->createSale($lead, $agent, $data, SaleStatus::PendingConfirmation);
                    $lead->next_followup_at = null;
                    $this->notifyManagers($lead, $sale);
                    break;

                case NextAction::MarkDoNotCall:
                    $lead->do_not_call_at = now();
                    $lead->next_followup_at = null;
                    break;

                case NextAction::NeedsReview:
                    $lead->next_followup_at = null;
                    $this->notifySupervisors($lead, $call);
                    break;

                default:
                    $lead->next_followup_at = null;
                    break;
            }

            $lead->save();

            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => $nextStatus,
                'by_user_id' => $agent->id,
                'note' => 'نتیجه تماس: '.$result->value,
            ]);

            $this->activity->log($agent, ActivityKind::Result, 'ثبت نتیجه تماس: '.$result->value, $lead->fullName());

            $agent->increment('points', self::POINTS_PER_CALL);
            $this->achievements->evaluateCounters($agent);

            $call = $call->fresh();
            $this->qaSampler->maybeSampleCall($call);

            broadcast(new CallResultSubmitted($call))->toOthers();

            return [
                'call' => $call->fresh(),
                'lead' => $lead->fresh(),
                'follow_up' => $followUp,
                'sale' => $sale,
                'next_action' => $nextAction,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createFollowUp(Lead $lead, User $agent, Call $call, array $data, NextAction $nextAction): FollowUp
    {
        $fu = $data['follow_up'] ?? [];
        $dueAt = $fu['due_at'] ?? now()->addHours($nextAction === NextAction::ScheduleConsultation ? 24 : 3);
        $kind = $fu['kind'] ?? ($nextAction === NextAction::ScheduleConsultation ? FollowupKind::Consultation->value : FollowupKind::Call->value);

        return FollowUp::query()->create([
            'lead_id' => $lead->id,
            'agent_id' => $agent->id,
            'kind' => $kind,
            'title' => $fu['title'] ?? ('پیگیری '.$lead->fullName()),
            'due_at' => $dueAt,
            'status' => FollowupStatus::Pending,
            'priority' => $fu['priority'] ?? ($lead->temperature->value === 'hot' ? 3 : 1),
            'note' => $fu['note'] ?? $data['note'] ?? null,
            'created_from_call_id' => $call->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createSale(Lead $lead, User $agent, array $data, SaleStatus $status): Sale
    {
        $sale = $data['sale'] ?? [];

        return Sale::query()->create([
            'lead_id' => $lead->id,
            'agent_id' => $agent->id,
            'team_id' => $agent->team_id,
            'product_id' => $sale['product_id'] ?? $lead->product_id,
            'amount' => $sale['amount'] ?? 0,
            'status' => $status,
            'payment_method' => $sale['payment_method'] ?? null,
            'submitted_at' => $status === SaleStatus::PendingConfirmation ? now() : null,
        ]);
    }

    private function notifyManagers(Lead $lead, Sale $sale): void
    {
        User::query()->role([RoleName::Manager->value, RoleName::Supervisor->value])->get()->each(
            fn (User $u) => $this->notifications->notify(
                $u,
                NotificationKind::Sale,
                'فروش در انتظار تایید',
                "فروش جدید برای {$lead->fullName()} ثبت شد و منتظر تایید است.",
                "/sales/{$sale->id}",
            )
        );
    }

    private function notifySupervisors(Lead $lead, Call $call): void
    {
        User::query()->role([RoleName::Supervisor->value, RoleName::Manager->value])->get()->each(
            fn (User $u) => $this->notifications->notify(
                $u,
                NotificationKind::Quality,
                'تماس ناقص نیازمند بررسی',
                "تماس با {$lead->fullName()} به‌صورت ناقص ثبت شد.",
                "/leads/{$lead->id}",
            )
        );
    }
}
