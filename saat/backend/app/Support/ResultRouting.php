<?php

namespace App\Support;

use App\Enums\CallResult;
use App\Enums\LeadStatus;
use App\Enums\NextAction;

/**
 * Mirrors the frontend's `resultToNextAction` / `resultToLeadStatus` maps
 * (src/data/labels.ts) so a call result always routes to the same next
 * action and lead status on both sides of the stack.
 */
class ResultRouting
{
    /**
     * @return array<string, string>
     */
    public static function nextAction(): array
    {
        return [
            CallResult::Interested->value => NextAction::CreateFollowUp->value,
            CallResult::VeryHot->value => NextAction::CreateFollowUp->value,
            CallResult::NeedsFollowup->value => NextAction::CreateFollowUp->value,
            CallResult::MeetingSet->value => NextAction::ScheduleConsultation->value,
            CallResult::PaymentPending->value => NextAction::CreatePaymentPendingSale->value,
            CallResult::Registered->value => NextAction::CreateSalePendingConfirmation->value,
            CallResult::NoAnswer->value => NextAction::ScheduleRetry->value,
            CallResult::Unavailable->value => NextAction::ScheduleRetry->value,
            CallResult::WrongNumber->value => NextAction::CloseLead->value,
            CallResult::NotInterested->value => NextAction::CloseLead->value,
            CallResult::DoNotDisturb->value => NextAction::MarkDoNotCall->value,
            CallResult::NeedsInfo->value => NextAction::CreateFollowUp->value,
            CallResult::NotDecisionMaker->value => NextAction::CreateFollowUp->value,
            CallResult::CallLater->value => NextAction::ScheduleRetry->value,
            CallResult::Duplicate->value => NextAction::MarkDuplicate->value,
            CallResult::PriceObjection->value => NextAction::CreateFollowUp->value,
            CallResult::BadTiming->value => NextAction::ScheduleRetry->value,
            CallResult::IncompleteCall->value => NextAction::NeedsReview->value,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function leadStatus(): array
    {
        return [
            CallResult::Interested->value => LeadStatus::FollowUpRequired->value,
            CallResult::VeryHot->value => LeadStatus::FollowUpRequired->value,
            CallResult::NeedsFollowup->value => LeadStatus::FollowUpRequired->value,
            CallResult::MeetingSet->value => LeadStatus::ConsultationScheduled->value,
            CallResult::PaymentPending->value => LeadStatus::PaymentPending->value,
            CallResult::Registered->value => LeadStatus::SalePendingConfirmation->value,
            CallResult::NoAnswer->value => LeadStatus::NoAnswer->value,
            CallResult::Unavailable->value => LeadStatus::Unreachable->value,
            CallResult::WrongNumber->value => LeadStatus::WrongNumber->value,
            CallResult::NotInterested->value => LeadStatus::Lost->value,
            CallResult::DoNotDisturb->value => LeadStatus::DoNotCall->value,
            CallResult::NeedsInfo->value => LeadStatus::FollowUpRequired->value,
            CallResult::NotDecisionMaker->value => LeadStatus::FollowUpRequired->value,
            CallResult::CallLater->value => LeadStatus::FollowUpRequired->value,
            CallResult::Duplicate->value => LeadStatus::Duplicate->value,
            CallResult::PriceObjection->value => LeadStatus::FollowUpRequired->value,
            CallResult::BadTiming->value => LeadStatus::FollowUpRequired->value,
            CallResult::IncompleteCall->value => LeadStatus::NeedsSupervisorReview->value,
        ];
    }

    public static function nextActionFor(CallResult $result): NextAction
    {
        return NextAction::from(self::nextAction()[$result->value]);
    }

    public static function leadStatusFor(CallResult $result): LeadStatus
    {
        return LeadStatus::from(self::leadStatus()[$result->value]);
    }
}
