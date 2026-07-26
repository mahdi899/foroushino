-- Run once on external host MySQL after initial schema:
-- mysql -u USER -p DATABASE < db/migrate-account-snapshot.sql

ALTER TABLE telegram_accounts_cache
    ADD COLUMN snapshot_revision VARCHAR(64) NULL AFTER is_bot_admin,
    ADD COLUMN owned_product_ids TEXT NULL AFTER snapshot_revision,
    ADD COLUMN profile_json MEDIUMTEXT NULL AFTER owned_product_ids,
    ADD COLUMN referral_json MEDIUMTEXT NULL AFTER profile_json,
    ADD COLUMN family_json MEDIUMTEXT NULL AFTER referral_json,
    ADD COLUMN owned_presents_json MEDIUMTEXT NULL AFTER family_json,
    ADD COLUMN snapshot_synced_at DATETIME NULL AFTER owned_presents_json;
