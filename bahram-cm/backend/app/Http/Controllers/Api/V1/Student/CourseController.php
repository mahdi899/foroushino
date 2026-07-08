<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\CourseAccessStatus;
use App\Enums\SpotplayerLicenseStatus;
use App\Http\Controllers\Controller;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Services\CourseAccessService;
use App\Services\MediaAltResolver;
use App\Support\ApiResponse;
use App\Support\MediaUrl;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request, CourseAccessService $courseAccesses): JsonResponse
    {
        $user = $request->user();
        $courseAccesses->syncFromPaidOrders($user);
        $items = $this->listPurchasedCourses($user, $courseAccesses);

        return ApiResponse::success($items);
    }

    public function player(Request $request, CourseAccess $courseAccess): JsonResponse
    {
        abort_unless($courseAccess->user_id === $request->user()->id, 404);

        $courseAccess->load(['product', 'spotplayerLicense']);
        $product = $courseAccess->product;
        abort_unless($product instanceof Product, 404);

        $license = null;
        if ($licenseId = $request->integer('license_id')) {
            $license = SpotplayerLicense::query()
                ->where('id', $licenseId)
                ->where('user_id', $request->user()->id)
                ->where('product_id', $product->id)
                ->first();
        }

        $license ??= app(CourseAccessService::class)->resolveLicense(
            $request->user(),
            $product,
            $courseAccess,
        );

        if (! $courseAccess->isActive() || ! $license) {
            return ApiResponse::success([
                'available' => false,
                'message' => 'دسترسی پخش برای این دوره فعال نیست.',
            ]);
        }

        $licenseUrl = $license->license_url;
        $scriptUrl = $licenseUrl ? $this->licenseScriptUrl($licenseUrl) : null;
        $spotplayerCourseId = $request->string('spotplayer_course_id')->trim()->toString()
            ?: $this->primaryCourseId($license->spotplayer_course_id ?: $product->spotplayer_course_id);

        return ApiResponse::success([
            'available' => true,
            'course_access_id' => $courseAccess->id,
            'license_id' => $license->id,
            'product_title' => $courseAccess->product?->title,
            'license_key' => $license->license_key,
            'spotplayer_course_id' => $spotplayerCourseId,
            'license_script_url' => $scriptUrl,
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function listPurchasedCourses(User $user, CourseAccessService $courseAccesses): array
    {
        $mobile = Mobile::normalize($user->mobile);
        $altResolver = app(MediaAltResolver::class);

        $accesses = $user->courseAccesses()
            ->with('product')
            ->get()
            ->keyBy('product_id');

        $licenses = SpotplayerLicense::query()
            ->with(['product', 'order', 'courseAccess'])
            ->whereNotNull('license_key')
            ->where(function ($query) use ($user, $mobile) {
                $query->where('user_id', $user->id);
                if ($mobile) {
                    $query->orWhereHas('order', fn ($order) => $order->where('customer_phone', $mobile));
                }
            })
            ->orderByDesc('id')
            ->get();

        $items = [];
        $licensedOrderIds = [];

        foreach ($licenses as $license) {
            if ($license->order_id) {
                $licensedOrderIds[] = (int) $license->order_id;
            }

            $product = $license->product;
            if (! $product instanceof Product) {
                continue;
            }

            $access = $license->courseAccess
                ?? $accesses->get($license->product_id);

            $items[] = $this->formatLicenseItem($access, $product, $license, $altResolver);
        }

        $paidOrders = $courseAccesses->paidOrdersForUser($user);

        foreach ($paidOrders as $order) {
            if (in_array((int) $order->id, $licensedOrderIds, true)) {
                continue;
            }

            $product = $order->product;
            if (! $product instanceof Product) {
                continue;
            }

            $access = $accesses->get($order->product_id);
            $items[] = $this->formatOrderItem($access, $product, $order, $altResolver);
        }

        $productsWithCards = collect($items)
            ->pluck('product.id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique();

        foreach ($accesses as $access) {
            $product = $access->product;
            if (! $product instanceof Product) {
                continue;
            }

            if ($productsWithCards->contains($product->id)) {
                continue;
            }

            $items[] = $this->formatAccessItem($access, $product, $altResolver);
        }

        return $items;
    }

    /** @return array<string, mixed> */
    private function formatAccessItem(
        CourseAccess $access,
        Product $product,
        MediaAltResolver $altResolver,
    ): array {
        $needsSpotPlayer = filled($product->spotplayer_course_id);

        return $this->baseCourseItem(
            listKey: 'access-'.$access->id,
            access: $access,
            product: $product,
            altResolver: $altResolver,
            activatedAt: $access->activated_at,
            isActive: $access->status === CourseAccessStatus::Active,
            pendingActivation: $needsSpotPlayer,
            orderNumber: null,
            orderId: $access->order_id,
            licenseId: null,
            license: null,
        );
    }

    /** @return array<string, mixed> */
    private function formatLicenseItem(
        ?CourseAccess $access,
        Product $product,
        SpotplayerLicense $license,
        MediaAltResolver $altResolver,
    ): array {
        $order = $license->order;
        $activatedAt = $order?->paid_at ?? $license->created_at;
        $isActive = $access?->status === CourseAccessStatus::Active
            || $license->status === SpotplayerLicenseStatus::Active;

        return $this->baseCourseItem(
            listKey: 'license-'.$license->id,
            access: $access,
            product: $product,
            altResolver: $altResolver,
            activatedAt: $activatedAt,
            isActive: $isActive,
            pendingActivation: false,
            orderNumber: $order?->order_number,
            orderId: $license->order_id,
            licenseId: $license->id,
            license: $license,
        );
    }

    /** @return array<string, mixed> */
    private function formatOrderItem(
        ?CourseAccess $access,
        Product $product,
        Order $order,
        MediaAltResolver $altResolver,
    ): array {
        $needsSpotPlayer = filled($product->spotplayer_course_id);
        $isActive = $access?->status === CourseAccessStatus::Active;
        $pendingActivation = $access === null || $needsSpotPlayer;

        return $this->baseCourseItem(
            listKey: 'order-'.$order->id,
            access: $access,
            product: $product,
            altResolver: $altResolver,
            activatedAt: $order->paid_at ?? $access?->activated_at,
            isActive: $isActive,
            pendingActivation: $pendingActivation,
            orderNumber: $order->order_number,
            orderId: $order->id,
            licenseId: null,
            license: null,
        );
    }

    /** @return array<string, mixed> */
    private function baseCourseItem(
        string $listKey,
        ?CourseAccess $access,
        Product $product,
        MediaAltResolver $altResolver,
        mixed $activatedAt,
        bool $isActive,
        bool $pendingActivation,
        ?string $orderNumber,
        ?int $orderId,
        ?int $licenseId,
        ?SpotplayerLicense $license,
    ): array {
        $imageRef = $product->featured_image
            ? MediaUrl::fromDiskPath($product->featured_image)
            : null;

        return [
            'list_key' => $listKey,
            'id' => $access?->id,
            'license_id' => $licenseId,
            'order_id' => $orderId,
            'product' => [
                'id' => $product->id,
                'title' => $product->title,
                'slug' => $product->slug,
                'featured_image' => $imageRef ? MediaUrl::resolve($imageRef, absolute: false) : null,
                'featured_image_alt' => $imageRef
                    ? $altResolver->resolve($imageRef, $product->title)
                    : null,
                'spotplayer_course_id' => $product->spotplayer_course_id,
            ],
            'status' => $access?->status->value ?? 'pending',
            'access_type' => $access?->access_type ?? 'lifetime',
            'activated_at' => $activatedAt?->toIso8601String(),
            'is_active' => $isActive,
            'pending_activation' => $pendingActivation,
            'order_number' => $orderNumber,
            'spotplayer' => $license ? [
                'status' => $license->status->value,
                'license_url' => $license->license_url,
                'license_key' => $license->license_key,
                'spotplayer_course_id' => $license->spotplayer_course_id,
            ] : null,
        ];
    }

    private function licenseScriptUrl(string $licenseUrl): string
    {
        $parts = parse_url($licenseUrl);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? 'dl.spotplayer.ir';
        $path = $parts['path'] ?? $licenseUrl;

        return "{$scheme}://{$host}{$path}?f=js";
    }

    private function primaryCourseId(?string $raw): ?string
    {
        if (blank($raw)) {
            return null;
        }

        $parts = preg_split('/\s*,\s*/', trim($raw)) ?: [];

        return trim((string) ($parts[0] ?? '')) ?: null;
    }
}
