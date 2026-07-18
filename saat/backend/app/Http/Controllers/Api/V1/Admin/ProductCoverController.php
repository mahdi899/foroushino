<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\UploadProductCoverRequest;
use App\Http\Resources\V1\ProductResource;
use App\Models\Product;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductCoverController extends Controller
{
    public function store(UploadProductCoverRequest $request, Product $product): JsonResponse
    {
        $file = $request->file('cover');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');

        if (! in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            return ApiResponse::validationError([
                'cover' => ['فرمت مجاز: JPG، PNG یا WebP.'],
            ]);
        }

        $this->deleteStoredCover($product->cover_image_url);

        $path = $file->storeAs(
            'products/covers',
            $product->slug.'.'.$extension,
            'public',
        );

        $product->update([
            'cover_image_url' => Storage::disk('public')->url($path),
        ]);

        return ApiResponse::success(
            new ProductResource($product->fresh()),
            'تصویر محصول به‌روزرسانی شد',
        );
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        abort_unless((bool) $request->user()?->can('admin.products'), 403, 'اجازه دسترسی ندارید.');

        $this->deleteStoredCover($product->cover_image_url);
        $product->update(['cover_image_url' => null]);

        return ApiResponse::success(
            new ProductResource($product->fresh()),
            'تصویر محصول حذف شد',
        );
    }

    private function deleteStoredCover(?string $cover): void
    {
        if ($cover === null || $cover === '') {
            return;
        }

        $path = $this->storedCoverPath($cover);
        if ($path !== null && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function storedCoverPath(string $cover): ?string
    {
        $storageUrl = rtrim(Storage::disk('public')->url(''), '/');

        if (Str::startsWith($cover, $storageUrl.'/products/covers/')) {
            return Str::after($cover, $storageUrl.'/');
        }

        if (Str::startsWith($cover, '/storage/products/covers/')) {
            return Str::after($cover, '/storage/');
        }

        return null;
    }
}
