-- Migration for existing host databases (run once if schema was created before 2026-07-22)
ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS photo_url VARCHAR(512) NULL;
ALTER TABLE catalog_seminars ADD COLUMN IF NOT EXISTS price BIGINT NULL;
ALTER TABLE catalog_seminars ADD COLUMN IF NOT EXISTS sale_price BIGINT NULL;
ALTER TABLE catalog_seminars ADD COLUMN IF NOT EXISTS photo_url VARCHAR(512) NULL;
