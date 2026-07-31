<?php

declare(strict_types=1);

namespace TelegramHost\Catalog;

use TelegramHost\Telegram\BotApiClient;
use TelegramHost\Telegram\TelegramApiException;

/** Sends catalog banners using cached Telegram file_id — URL only on first send. */
final class CatalogPhotoMessenger
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly CatalogPhotoCache $photos,
    ) {}

    /**
     * @param  array<string, mixed>  $options
     */
    public function send(
        int|string $chatId,
        string $photo,
        string $caption,
        array $options = [],
        ?int $productId = null,
        ?int $seminarId = null,
    ): void {
        $photo = trim($photo);
        if ($photo === '') {
            $this->api->sendMessage($chatId, $caption, $options);

            return;
        }

        $sentUrl = CatalogPhotoCache::looksLikeUrl($photo);

        try {
            $result = $this->api->sendPhotoResult($chatId, $photo, $caption, $options);
            $this->rememberFromResult($result, $sentUrl, $productId, $seminarId);

            return;
        } catch (TelegramApiException $e) {
            if (! $this->isStaleFileIdError($e) || $sentUrl) {
                throw $e;
            }
        }

        $fallbackUrl = $this->fallbackUrl($productId, $seminarId);
        if ($fallbackUrl === '') {
            throw new TelegramApiException('Catalog photo file_id invalid and no fallback URL.');
        }

        if ($productId !== null && $productId > 0) {
            $this->photos->clearProductFileId($productId);
        }
        if ($seminarId !== null && $seminarId > 0) {
            $this->photos->clearSeminarFileId($seminarId);
        }

        $result = $this->api->sendPhotoResult($chatId, $fallbackUrl, $caption, $options);
        $this->rememberFromResult($result, true, $productId, $seminarId);
    }

    /** @param array<string, mixed> $result */
    private function rememberFromResult(
        array $result,
        bool $sentUrl,
        ?int $productId,
        ?int $seminarId,
    ): void {
        if (! $sentUrl) {
            return;
        }

        $fileId = BotApiClient::extractPhotoFileId($result);
        if ($fileId === null) {
            return;
        }

        if ($productId !== null && $productId > 0) {
            $this->photos->rememberProductFileId($productId, $fileId);
        }
        if ($seminarId !== null && $seminarId > 0) {
            $this->photos->rememberSeminarFileId($seminarId, $fileId);
        }
    }

    private function fallbackUrl(?int $productId, ?int $seminarId): string
    {
        if ($productId !== null && $productId > 0) {
            $url = $this->photos->productPhotoUrl($productId);
            if ($url !== '') {
                return $url;
            }
        }

        if ($seminarId !== null && $seminarId > 0) {
            return $this->photos->seminarPhotoUrl($seminarId);
        }

        return '';
    }

    private function isStaleFileIdError(TelegramApiException $e): bool
    {
        $message = strtolower($e->getMessage());

        return str_contains($message, 'wrong file identifier')
            || str_contains($message, 'wrong file_id')
            || str_contains($message, 'file_id');
    }
}
