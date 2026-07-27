<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\ReferenceChannel;
use App\Models\UserIdentityProfile;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\DestinationInviteLinkService;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\ReferenceChannelAccessService;
use App\Services\ReferenceChannelPricingService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceChannelController extends Controller
{
    public function index(Request $request, ReferenceChannelAccessService $access): JsonResponse
    {
        $user = $request->user();
        $access->syncFromPaidOrders($user);

        $channels = ReferenceChannel::query()
            ->whereHas('entitlements', fn ($q) => $q->where('user_id', $user->id))
            ->with(['entitlements' => fn ($q) => $q->where('user_id', $user->id), 'product'])
            ->orderByDesc('id')
            ->get();

        $level = (int) (UserIdentityProfile::query()->where('user_id', $user->id)->value('verification_level') ?? 1);
        $botUrl = TelegramSiteUrl::botStartDeepLink('reference');

        return ApiResponse::success($channels->map(fn (ReferenceChannel $channel) => [
            'id' => $channel->id,
            'slug' => $channel->slug,
            'title' => $channel->title,
            'product_slug' => $channel->product?->slug,
            'identity_ready' => $level >= 2,
            'verification_level' => $level,
            'bot_start_url' => $botUrl,
            'source' => $channel->entitlements->first()?->source,
        ]));
    }

    /**
     * Published channels available to buy in the student panel (not yet entitled).
     */
    public function offer(
        Request $request,
        ReferenceChannelAccessService $access,
        ReferenceChannelPricingService $pricing,
    ): JsonResponse {
        $user = $request->user();
        $access->syncFromPaidOrders($user);

        $channels = ReferenceChannel::query()
            ->where('status', 'published')
            ->where('show_in_panel', true)
            ->where('price', '>', 0)
            ->with('product')
            ->orderByDesc('id')
            ->get()
            ->filter(fn (ReferenceChannel $channel) => ! $access->userHasEntitlement($user, $channel))
            ->filter(fn (ReferenceChannel $channel) => filled($channel->product?->slug) && (bool) $channel->product?->is_active)
            ->values();

        return ApiResponse::success($channels->map(function (ReferenceChannel $channel) use ($user, $pricing) {
            $quote = $pricing->quote($channel, $user);

            return [
                'id' => $channel->id,
                'slug' => $channel->slug,
                'title' => $channel->title,
                'description' => $channel->description,
                'product_slug' => $channel->product?->slug,
                'purchase_path' => '/purchase/'.$channel->product->slug,
                'amount' => $quote['amount'],
                'final_amount' => $quote['final_amount'],
                'seminar_discount' => $quote['seminar_discount'],
                'seminar_off' => $quote['seminar_off'],
            ];
        }));
    }

    public function show(
        Request $request,
        int $channel,
        ReferenceChannelAccessService $access,
        DestinationInviteLinkService $invites,
    ): JsonResponse {
        $user = $request->user();
        $access->syncFromPaidOrders($user);

        $model = ReferenceChannel::query()->with('product', 'telegramDestination')->findOrFail($channel);

        if (! $access->userHasEntitlement($user, $model)) {
            return ApiResponse::error('not_found', 'این کانال مرجع برای شما ثبت نشده است.', 404);
        }

        $level = (int) (UserIdentityProfile::query()->where('user_id', $user->id)->value('verification_level') ?? 1);
        $identityReady = $level >= 2;
        $botUrl = TelegramSiteUrl::botStartDeepLink('reference');
        $identityUrl = TelegramSiteUrl::identityPage();

        $inviteUrl = null;
        $inviteStatus = 'need_identity';
        $account = TelegramAccount::query()
            ->where('user_id', $user->id)
            ->whereHas('bot', fn ($q) => $q->where('key', 'production'))
            ->with('bot')
            ->first();
        $telegramLinked = $account !== null;

        if (! $identityReady) {
            $inviteStatus = 'need_identity';
        } elseif (! $telegramLinked) {
            $inviteStatus = 'need_telegram';
        } elseif ($model->telegramDestination) {
            $bot = $account?->bot ?? TelegramBot::query()->where('key', 'production')->first();
            if ($bot && $account) {
                $resolved = $invites->resolveForAccount($bot, $model->telegramDestination, $account);
                $inviteUrl = $resolved['invite_url'] ?? null;
                $inviteStatus = $resolved['status'] ?? ($inviteUrl ? 'invite' : 'pending');
            }
        } else {
            $inviteStatus = 'not_configured';
        }

        return ApiResponse::success([
            'id' => $model->id,
            'title' => $model->title,
            'slug' => $model->slug,
            'description' => $model->description,
            'product_slug' => $model->product?->slug,
            'identity_ready' => $identityReady,
            'verification_level' => $level,
            'identity_url' => $identityUrl,
            'bot_start_url' => $botUrl,
            'telegram_linked' => $telegramLinked,
            'invite_status' => $inviteStatus,
            'invite_url' => $inviteUrl,
            'destination_title' => $model->telegramDestination?->title,
        ]);
    }
}
