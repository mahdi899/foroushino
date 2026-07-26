-- Fixes "Unknown column 'snapshot_revision'" (and similar) on hosts whose
-- telegram_accounts_cache table was created before these columns existed
-- in schema.sql. Safe to run multiple times (each ADD COLUMN is guarded).
--
-- Run in phpMyAdmin: select your telegram host database → SQL tab → paste → Go.

ALTER TABLE telegram_accounts_cache
    ADD COLUMN IF NOT EXISTS snapshot_revision VARCHAR(64) NULL AFTER is_bot_admin,
    ADD COLUMN IF NOT EXISTS owned_product_ids TEXT NULL AFTER snapshot_revision,
    ADD COLUMN IF NOT EXISTS profile_json MEDIUMTEXT NULL AFTER owned_product_ids,
    ADD COLUMN IF NOT EXISTS referral_json MEDIUMTEXT NULL AFTER profile_json,
    ADD COLUMN IF NOT EXISTS family_json MEDIUMTEXT NULL AFTER referral_json,
    ADD COLUMN IF NOT EXISTS owned_presents_json MEDIUMTEXT NULL AFTER family_json,
    ADD COLUMN IF NOT EXISTS snapshot_synced_at DATETIME NULL AFTER owned_presents_json;

-- Sanity check — should show all 13 columns after running.
-- SHOW COLUMNS FROM telegram_accounts_cache;
