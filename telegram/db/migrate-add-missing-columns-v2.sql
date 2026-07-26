-- Compatible with MySQL 5.7 / older MariaDB (no "IF NOT EXISTS" on ADD COLUMN).
-- Run each statement; MySQL will error with "Duplicate column name" for any
-- column that already exists — that's fine, just skip that line and continue
-- with the next one. In phpMyAdmin's SQL tab, run them ONE AT A TIME if you
-- want to safely ignore "duplicate column" errors, or use the whole block —
-- phpMyAdmin will show which lines failed (already exist) and which succeeded.

ALTER TABLE telegram_accounts_cache ADD COLUMN snapshot_revision VARCHAR(64) NULL AFTER is_bot_admin;
ALTER TABLE telegram_accounts_cache ADD COLUMN owned_product_ids TEXT NULL AFTER snapshot_revision;
ALTER TABLE telegram_accounts_cache ADD COLUMN profile_json MEDIUMTEXT NULL AFTER owned_product_ids;
ALTER TABLE telegram_accounts_cache ADD COLUMN referral_json MEDIUMTEXT NULL AFTER profile_json;
ALTER TABLE telegram_accounts_cache ADD COLUMN family_json MEDIUMTEXT NULL AFTER referral_json;
ALTER TABLE telegram_accounts_cache ADD COLUMN owned_presents_json MEDIUMTEXT NULL AFTER family_json;
ALTER TABLE telegram_accounts_cache ADD COLUMN snapshot_synced_at DATETIME NULL AFTER owned_presents_json;

-- Sanity check — run this AFTER the above and paste the result back:
SHOW COLUMNS FROM telegram_accounts_cache;
