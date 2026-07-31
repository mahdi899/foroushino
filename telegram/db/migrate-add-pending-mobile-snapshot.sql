-- Extend mobile pre-provisioning with full Iran snapshot (licenses, profile, KYC).
-- Safe to re-run: ADD COLUMN is guarded with information_schema checks on MySQL 8+.

ALTER TABLE telegram_pending_access_by_mobile
    ADD COLUMN IF NOT EXISTS user_id BIGINT UNSIGNED NULL AFTER display_name,
    ADD COLUMN IF NOT EXISTS verification_level TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER user_id,
    ADD COLUMN IF NOT EXISTS snapshot_json MEDIUMTEXT NULL AFTER verification_level;
