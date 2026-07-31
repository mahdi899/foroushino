<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use App\Models\Seminar;
use App\Support\MediaUrl;
use Illuminate\Support\Facades\Log;

/**
 * Resolves Telegram photo inputs (cached file_id preferred) for catalog banners.
 * First send uploads by public URL; Telegram file_id is stored for reuse.
 */
class TelegramCatalogMediaService
{
    public function productPhoto(Product $product): ?string
    {
        $source = $this->productPhotoSourcePath($product);
        if ($source === '') {
            return null;
        }

        $cachedId = trim((string) ($product->telegram_photo_file_id ?? ''));
        $cachedSource = trim((string) ($product->telegram_photo_source ?? ''));
        if ($cachedId !== '' && $cachedSource === $source) {
            return $cachedId;
        }

        return $this->publicUrl($source);
    }

    public function productPhotoSourceUrl(Product $product): ?string
    {
        $source = $this->productPhotoSourcePath($product);

        return $source !== '' ? $this->publicUrl($source) : null;
    }

    public function seminarPhotoSourceUrl(Seminar $seminar): ?string
    {
        $source = $this->seminarPhotoSourcePath($seminar);

        return $source !== '' ? $this->publicUrl($source) : null;
    }

    public function productTelegramFileId(Product $product): ?string
    {
        $source = $this->productPhotoSourcePath($product);
        if ($source === '') {
            return null;
        }

        $cachedId = trim((string) ($product->telegram_photo_file_id ?? ''));
        $cachedSource = trim((string) ($product->telegram_photo_source ?? ''));

        return $cachedId !== '' && $cachedSource === $source ? $cachedId : null;
    }

    public function seminarTelegramFileId(Seminar $seminar): ?string
    {
        $source = $this->seminarPhotoSourcePath($seminar);
        if ($source === '') {
            return null;
        }

        $cachedId = trim((string) ($seminar->telegram_photo_file_id ?? ''));
        $cachedSource = trim((string) ($seminar->telegram_photo_source ?? ''));

        return $cachedId !== '' && $cachedSource === $source ? $cachedId : null;
    }

    public function seminarPhoto(Seminar $seminar): ?string
    {
        $source = $this->seminarPhotoSourcePath($seminar);
        if ($source === '') {
            return null;
        }

        $cachedId = trim((string) ($seminar->telegram_photo_file_id ?? ''));
        $cachedSource = trim((string) ($seminar->telegram_photo_source ?? ''));
        if ($cachedId !== '' && $cachedSource === $source) {
            return $cachedId;
        }

        return $this->publicUrl($source);
    }

    /** @param  array<string, mixed>  $sendPhotoResult */
    public function rememberProductPhoto(Product $product, array $sendPhotoResult): void
    {
        $fileId = $this->extractFileId($sendPhotoResult);
        $source = trim((string) ($product->featured_image ?? ''));
        if ($fileId === null || $source === '') {
            return;
        }

        try {
            $product->forceFill([
                'telegram_photo_file_id' => $fileId,
                'telegram_photo_source' => $source,
            ])->saveQuietly();
        } catch (\Throwable $e) {
            Log::channel('telegram')->warning('Failed to cache product telegram photo file_id.', [
                'product_id' => $product->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /** @param  array<string, mixed>  $sendPhotoResult */
    public function rememberSeminarPhoto(Seminar $seminar, array $sendPhotoResult): void
    {
        $fileId = $this->extractFileId($sendPhotoResult);
        $source = trim((string) ($seminar->cover_image ?: $seminar->cover_image_mobile ?: ''));
        if ($fileId === null || $source === '') {
            return;
        }

        try {
            $seminar->forceFill([
                'telegram_photo_file_id' => $fileId,
                'telegram_photo_source' => $source,
            ])->saveQuietly();
        } catch (\Throwable $e) {
            Log::channel('telegram')->warning('Failed to cache seminar telegram photo file_id.', [
                'seminar_id' => $seminar->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /** @param  array<string, mixed>  $result */
    private function extractFileId(array $result): ?string
    {
        $photos = $result['photo'] ?? null;
        if (! is_array($photos) || $photos === []) {
            return null;
        }

        $last = $photos[array_key_last($photos)] ?? null;
        $fileId = is_array($last) ? trim((string) ($last['file_id'] ?? '')) : '';

        return $fileId !== '' ? $fileId : null;
    }

    private function publicUrl(string $pathOrRef): ?string
    {
        $ref = MediaUrl::fromDiskPath($pathOrRef) ?? $pathOrRef;
        $url = MediaUrl::resolve($ref);
        $url = is_string($url) ? trim($url) : '';

        if ($url === '' || ! str_starts_with($url, 'http')) {
            return null;
        }

        return $url;
    }

    private function productPhotoSourcePath(Product $product): string
    {
        return trim((string) ($product->featured_image ?? ''));
    }

    private function seminarPhotoSourcePath(Seminar $seminar): string
    {
        return trim((string) ($seminar->cover_image ?: $seminar->cover_image_mobile ?: ''));
    }
}
