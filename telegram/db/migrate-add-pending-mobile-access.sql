-- Run once on existing installs to add the mobile-keyed pre-provisioning
-- table (new installs get it automatically from schema.sql).
-- Safe to re-run: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS telegram_pending_access_by_mobile (
    mobile VARCHAR(20) NOT NULL PRIMARY KEY,
    owned_product_ids TEXT NULL,
    display_name VARCHAR(191) NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
