-- Cache Telegram file_id for catalog banners — avoids re-fetching CDN URLs on every send.
-- Run once; ignore "Duplicate column name" if already applied.

ALTER TABLE catalog_products ADD COLUMN telegram_photo_file_id VARCHAR(255) NULL AFTER photo_url;
ALTER TABLE catalog_seminars ADD COLUMN telegram_photo_file_id VARCHAR(255) NULL AFTER photo_url;
