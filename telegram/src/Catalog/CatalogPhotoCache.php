<?php

declare(strict_types=1);

namespace TelegramHost\Catalog;

/** Reads/writes Telegram file_id cache for catalog product and seminar banners. */
final class CatalogPhotoCache
{
    public function __construct(private readonly \PDO $pdo) {}

    public function rememberProductFileId(int $productId, string $fileId): void
    {
        if ($productId <= 0 || trim($fileId) === '') {
            return;
        }

        $this->ensureColumns();
        $stmt = $this->pdo->prepare(
            'UPDATE catalog_products SET telegram_photo_file_id = :file_id WHERE id = :id',
        );
        $stmt->execute(['file_id' => $fileId, 'id' => $productId]);
    }

    public function rememberSeminarFileId(int $seminarId, string $fileId): void
    {
        if ($seminarId <= 0 || trim($fileId) === '') {
            return;
        }

        $this->ensureColumns();
        $stmt = $this->pdo->prepare(
            'UPDATE catalog_seminars SET telegram_photo_file_id = :file_id WHERE id = :id',
        );
        $stmt->execute(['file_id' => $fileId, 'id' => $seminarId]);
    }

    public function clearProductFileId(int $productId): void
    {
        if ($productId <= 0) {
            return;
        }

        $this->ensureColumns();
        $stmt = $this->pdo->prepare(
            'UPDATE catalog_products SET telegram_photo_file_id = NULL WHERE id = :id',
        );
        $stmt->execute(['id' => $productId]);
    }

    public function clearSeminarFileId(int $seminarId): void
    {
        if ($seminarId <= 0) {
            return;
        }

        $this->ensureColumns();
        $stmt = $this->pdo->prepare(
            'UPDATE catalog_seminars SET telegram_photo_file_id = NULL WHERE id = :id',
        );
        $stmt->execute(['id' => $seminarId]);
    }

    /** @param array<string, mixed> $row */
    public function resolveProductPhoto(array $row): string
    {
        $fileId = trim((string) ($row['telegram_photo_file_id'] ?? ''));
        if ($fileId !== '') {
            return $fileId;
        }

        return trim((string) ($row['photo_url'] ?? ''));
    }

    /** @param array<string, mixed> $row */
    public function resolveSeminarPhoto(array $row): string
    {
        $fileId = trim((string) ($row['telegram_photo_file_id'] ?? ''));
        if ($fileId !== '') {
            return $fileId;
        }

        return trim((string) ($row['photo_url'] ?? ''));
    }

    public static function looksLikeUrl(string $photo): bool
    {
        $photo = trim($photo);

        return $photo !== '' && (str_starts_with($photo, 'http://') || str_starts_with($photo, 'https://'));
    }

    /** @return array<int, string> product_id => telegram_photo_file_id */
    public function existingProductFileIds(): array
    {
        $this->ensureColumns();
        $rows = $this->pdo->query(
            'SELECT id, telegram_photo_file_id FROM catalog_products WHERE telegram_photo_file_id IS NOT NULL',
        )->fetchAll();

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = (int) ($row['id'] ?? 0);
            $fileId = trim((string) ($row['telegram_photo_file_id'] ?? ''));
            if ($id > 0 && $fileId !== '') {
                $out[$id] = $fileId;
            }
        }

        return $out;
    }

    /** @return array<int, string> seminar_id => telegram_photo_file_id */
    public function existingSeminarFileIds(): array
    {
        $this->ensureColumns();
        $rows = $this->pdo->query(
            'SELECT id, telegram_photo_file_id FROM catalog_seminars WHERE telegram_photo_file_id IS NOT NULL',
        )->fetchAll();

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = (int) ($row['id'] ?? 0);
            $fileId = trim((string) ($row['telegram_photo_file_id'] ?? ''));
            if ($id > 0 && $fileId !== '') {
                $out[$id] = $fileId;
            }
        }

        return $out;
    }

    /** @return array<int, string> product_id => photo_url */
    public function existingProductPhotoUrls(): array
    {
        $rows = $this->pdo->query('SELECT id, photo_url FROM catalog_products')->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $out[$id] = trim((string) ($row['photo_url'] ?? ''));
            }
        }

        return $out;
    }

    /** @return array<int, string> seminar_id => photo_url */
    public function existingSeminarPhotoUrls(): array
    {
        $rows = $this->pdo->query('SELECT id, photo_url FROM catalog_seminars')->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = (int) ($row['id'] ?? 0);
            if ($id > 0) {
                $out[$id] = trim((string) ($row['photo_url'] ?? ''));
            }
        }

        return $out;
    }

    public function productPhotoUrl(int $productId): string
    {
        if ($productId <= 0) {
            return '';
        }

        $stmt = $this->pdo->prepare('SELECT photo_url FROM catalog_products WHERE id = :id');
        $stmt->execute(['id' => $productId]);
        $url = $stmt->fetchColumn();

        return is_string($url) ? trim($url) : '';
    }

    public function seminarPhotoUrl(int $seminarId): string
    {
        if ($seminarId <= 0) {
            return '';
        }

        $stmt = $this->pdo->prepare('SELECT photo_url FROM catalog_seminars WHERE id = :id');
        $stmt->execute(['id' => $seminarId]);
        $url = $stmt->fetchColumn();

        return is_string($url) ? trim($url) : '';
    }

    private function ensureColumns(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        foreach (['catalog_products', 'catalog_seminars'] as $table) {
            try {
                $this->pdo->exec(
                    "ALTER TABLE {$table} ADD COLUMN telegram_photo_file_id VARCHAR(255) NULL AFTER photo_url",
                );
            } catch (\Throwable) {
                // column already exists
            }
        }

        $ready = true;
    }
}
