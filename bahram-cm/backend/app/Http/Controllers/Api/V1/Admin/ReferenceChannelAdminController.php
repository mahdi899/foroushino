<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Services\ReferenceChannelAccessService;
use App\Services\ReferenceChannelProductService;
use App\Support\MediaUrl;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceChannelAdminController extends Controller
{
    public function __construct(
        private ReferenceChannelProductService $products,
        private ReferenceChannelAccessService $access,
    ) {}

    public function index(): JsonResponse
    {
        $channels = ReferenceChannel::query()
            ->with(['product', 'telegramDestination'])
            ->withCount('entitlements')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $channels->map(fn (ReferenceChannel $c) => $this->listPayload($c))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateChannel($request);

        $channel = ReferenceChannel::create($data);
        $this->products->syncProduct($channel->fresh());
        $this->syncDestinationRequirement($channel->fresh());

        return response()->json(['data' => $this->listPayload($channel->fresh(['product', 'telegramDestination']))], 201);
    }

    public function show(int $id): JsonResponse
    {
        $channel = ReferenceChannel::query()
            ->with(['product', 'telegramDestination', 'entitlements.user'])
            ->withCount('entitlements')
            ->findOrFail($id);

        return response()->json(['data' => [
            ...$this->listPayload($channel),
            'description' => $channel->description,
            'entitlements' => $channel->entitlements->map(fn (ReferenceChannelEntitlement $e) => [
                'id' => $e->id,
                'user_id' => $e->user_id,
                'name' => $e->user?->name,
                'mobile' => $e->user?->mobile,
                'source' => $e->source,
                'order_id' => $e->order_id,
                'created_at' => $e->created_at?->toIso8601String(),
            ]),
        ]]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $channel = ReferenceChannel::query()->findOrFail($id);
        $data = $this->validateChannel($request, partial: true);

        $channel->update($data);
        $channel = $channel->fresh();
        $this->products->syncProduct($channel);
        $this->syncDestinationRequirement($channel);

        app(\App\Services\TelegramHostCatalogRevision::class)->bump(scope: 'all');

        return response()->json(['data' => $this->listPayload($channel->fresh(['product', 'telegramDestination']))]);
    }

    public function addEntitlement(Request $request, int $id): JsonResponse
    {
        $channel = ReferenceChannel::query()->findOrFail($id);

        $data = $request->validate([
            'mobile' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $mobile = Mobile::normalize($data['mobile']);
        abort_if(! $mobile, 422, 'شماره موبایل معتبر نیست.');

        $user = User::query()->firstOrCreate(
            ['mobile' => $mobile],
            ['name' => $data['name'] ?? 'دانشجو', 'status' => 'active']
        );

        $entitlement = $this->access->grant($channel, $user, null, 'admin');

        return response()->json(['data' => [
            'id' => $entitlement->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'mobile' => $user->mobile,
            'source' => $entitlement->source,
        ]], 201);
    }

    public function destinationsOptions(): JsonResponse
    {
        $items = TelegramDestination::query()
            ->where('is_active', true)
            ->orderBy('title')
            ->get(['id', 'title', 'chat_id', 'username']);

        return response()->json(['data' => $items]);
    }

    /** @return array<string, mixed> */
    private function validateChannel(Request $request, bool $partial = false): array
    {
        $rules = [
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:draft,published'],
            'show_in_panel' => ['sometimes', 'boolean'],
            'show_in_telegram' => ['sometimes', 'boolean'],
            'price' => [$partial ? 'sometimes' : 'required', 'integer', 'min:0'],
            'telegram_destination_id' => ['nullable', 'integer', 'exists:telegram_destinations,id'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'cover_image_mobile' => ['nullable', 'string', 'max:500'],
        ];

        $data = $request->validate($rules);

        foreach (['show_in_panel', 'show_in_telegram'] as $flag) {
            if (array_key_exists($flag, $data)) {
                $data[$flag] = (bool) $data[$flag];
            }
        }

        foreach (['cover_image', 'cover_image_mobile'] as $coverKey) {
            if (array_key_exists($coverKey, $data) && filled($data[$coverKey])) {
                $data[$coverKey] = MediaUrl::reference($data[$coverKey]) ?? $data[$coverKey];
            }
        }

        return $data;
    }

    /**
     * Keep destination requirement aligned with the linked reference product.
     */
    private function syncDestinationRequirement(ReferenceChannel $channel): void
    {
        if (! $channel->telegram_destination_id || ! $channel->product_id) {
            return;
        }

        $destination = TelegramDestination::query()->find($channel->telegram_destination_id);
        if (! $destination) {
            return;
        }

        $destination->requirements()->updateOrCreate(
            [
                'requirement_type' => 'product',
                'group_key' => 'default',
            ],
            [
                    'requirement_value' => (string) (int) $channel->product_id,
                'operator' => 'all',
            ]
        );
    }

    /** @return array<string, mixed> */
    private function listPayload(ReferenceChannel $c): array
    {
        $c->loadMissing(['product', 'telegramDestination']);

        return [
            'id' => $c->id,
            'title' => $c->title,
            'slug' => $c->slug,
            'status' => $c->status,
            'show_in_panel' => (bool) ($c->show_in_panel ?? true),
            'show_in_telegram' => (bool) ($c->show_in_telegram ?? true),
            'price' => $c->price,
            'product_id' => $c->product_id,
            'product_slug' => $c->product?->slug,
            'telegram_destination_id' => $c->telegram_destination_id,
            'telegram_destination_title' => $c->telegramDestination?->title,
            'cover_image' => $c->cover_image,
            'cover_image_mobile' => $c->cover_image_mobile,
            'entitlements_count' => $c->entitlements_count ?? $c->entitlements()->count(),
        ];
    }
}
