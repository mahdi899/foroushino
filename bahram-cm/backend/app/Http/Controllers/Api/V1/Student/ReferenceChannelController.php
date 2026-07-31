<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\ReferenceChannel;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\DestinationInviteLinkService;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\ReferenceChannelAccessService;
use App\Services\ReferenceChannelPricingService;
use App\Support\ApiResponse;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceChannelController extends Controller
{
    public function index(
        Request $request,
        ReferenceChannelAccessService $access,
        ReferenceChannelPricingService $pricing,
        DestinationInviteLinkService $invites,
    ): JsonResponse {
        $user = $request->user();
        $access->syncFromPaidOrders($user);

        $channels = ReferenceChannel::query()
            ->whereHas('entitlements', fn ($q) => $q->where('user_id', $user->id))
            ->with([
                'entitlements' => fn ($q) => $q->where('user_id', $user->id),
                'product',
                'telegramDestination',
            ])
            ->orderByDesc('id')
            ->get();

        $level = (int) (UserIdentityProfile::query()->where('user_id', $user->id)->value('verification_level') ?? 1);
        $botUrl = TelegramSiteUrl::botStartDeepLink('reference');
        $badges = $this->seminarBadgesPayload($pricing, $user);
        $account = TelegramAccount::query()
            ->where('user_id', $user->id)
            ->whereHas('bot', fn ($q) => $q->where('key', 'production'))
            ->with('bot')
            ->first();

        return ApiResponse::success($channels->map(function (ReferenceChannel $channel) use ($level, $botUrl, $badges, $account, $invites) {
            $inviteStatus = 'need_identity';
            $inviteUrl = null;

            if ($level < 2) {
                $inviteStatus = 'need_identity';
            } elseif ($account === null) {
                $inviteStatus = 'need_telegram';
            } elseif ($channel->telegramDestination) {
                $bot = $account->bot ?? TelegramBot::query()->where('key', 'production')->first();
                if ($bot) {
                    $resolved = $invites->resolveForAccount($bot, $channel->telegramDestination, $account);
                    $inviteUrl = $resolved['invite_url'] ?? null;
                    $inviteStatus = $resolved['status'] ?? ($inviteUrl ? 'invite' : 'pending');
                }
            } else {
                $inviteStatus = 'not_configured';
            }

            return [
                'id' => $channel->id,
                'slug' => $channel->slug,
                'title' => $channel->title,
                'description' => $channel->description,
                'cover_image' => $this->coverImage($channel),
                'cover_image_mobile' => $this->coverImageMobile($channel),
                'product_slug' => $channel->product?->slug,
                'identity_ready' => $level >= 2,
                'verification_level' => $level,
                'bot_start_url' => $botUrl,
                'source' => $channel->entitlements->first()?->source,
                'seminar_badges' => $badges,
                'invite_status' => $inviteStatus,
                'owned' => true,
            ];
        }));
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

        $badges = $this->seminarBadgesPayload($pricing, $user);

        return ApiResponse::success($channels->map(function (ReferenceChannel $channel) use ($user, $pricing, $badges) {
            $quote = $pricing->quote($channel, $user);

            return [
                'id' => $channel->id,
                'slug' => $channel->slug,
                'title' => $channel->title,
                'description' => $channel->description,
                'cover_image' => $this->coverImage($channel),
                'cover_image_mobile' => $this->coverImageMobile($channel),
                'product_slug' => $channel->product?->slug,
                'purchase_path' => '/purchase/'.$channel->product->slug,
                'amount' => $quote['amount'],
                'final_amount' => $quote['final_amount'],
                'seminar_discount' => $quote['seminar_discount'],
                'seminar_off' => $quote['seminar_off'],
                'seminar_title' => $quote['seminar_title'] ?? null,
                'seminar_badges' => $badges,
                'owned' => false,
            ];
        }));
    }

    public function show(
        Request $request,
        int $channel,
        ReferenceChannelAccessService $access,
        DestinationInviteLinkService $invites,
        ReferenceChannelPricingService $pricing,
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
            'cover_image' => $this->coverImage($model),
            'cover_image_mobile' => $this->coverImageMobile($model),
            'product_slug' => $model->product?->slug,
            'identity_ready' => $identityReady,
            'verification_level' => $level,
            'identity_url' => $identityUrl,
            'bot_start_url' => $botUrl,
            'telegram_linked' => $telegramLinked,
            'invite_status' => $inviteStatus,
            'destination_title' => $model->telegramDestination?->title,
            'seminar_badges' => $this->seminarBadgesPayload($pricing, $user),
            'owned' => true,
        ]);
    }

    private function coverImage(ReferenceChannel $channel): ?string
    {
        $raw = $channel->cover_image
            ?: $channel->product?->featured_image
            ?: null;

        return $this->resolveCoverUrl($raw);
    }

    private function coverImageMobile(ReferenceChannel $channel): ?string
    {
        $raw = $channel->cover_image_mobile
            ?: $channel->cover_image
            ?: $channel->product?->featured_image
            ?: null;

        return $this->resolveCoverUrl($raw);
    }

    private function resolveCoverUrl(mixed $raw): ?string
    {
        if (! filled($raw)) {
            return null;
        }

        $ref = MediaUrl::fromDiskPath((string) $raw) ?? MediaUrl::reference((string) $raw);

        return $ref ? MediaUrl::resolve($ref, absolute: false) : null;
    }

    /**
     * @return list<array{id: int, title: string, label: string}>
     */
    private function seminarBadgesPayload(ReferenceChannelPricingService $pricing, User $user): array
    {
        return array_map(
            static fn (array $row): array => [
                'id' => (int) $row['id'],
                'title' => (string) $row['title'],
                'label' => (string) $row['label'],
            ],
            $pricing->qualifyingSeminarBadges($user),
        );
    }
}
