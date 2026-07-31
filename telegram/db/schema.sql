-- Telegram host app — local MySQL schema (cPanel database).
-- Run once via: mysql -u USER -p DATABASE < db/schema.sql

CREATE TABLE IF NOT EXISTS bot_messages (
    message_key VARCHAR(64) NOT NULL PRIMARY KEY,
    body MEDIUMTEXT NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bot_feature_flags (
    flag_key VARCHAR(64) NOT NULL PRIMARY KEY,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS required_chats (
    id INT NOT NULL PRIMARY KEY,
    chat_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NULL,
    invite_link VARCHAR(512) NULL,
    is_required TINYINT(1) NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS catalog_products (
    id INT NOT NULL PRIMARY KEY,
    slug VARCHAR(191) NOT NULL,
    title VARCHAR(255) NOT NULL,
    price BIGINT NULL,
    sale_price BIGINT NULL,
    photo_url VARCHAR(512) NULL,
    telegram_photo_file_id VARCHAR(255) NULL,
    product_type VARCHAR(64) NULL,
    synced_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS catalog_seminars (
    id INT NOT NULL PRIMARY KEY,
    product_id INT NULL,
    title VARCHAR(255) NOT NULL,
    seminar_date DATETIME NULL,
    location VARCHAR(255) NULL,
    capacity_hint INT NULL,
    price BIGINT NULL,
    sale_price BIGINT NULL,
    photo_url VARCHAR(512) NULL,
    telegram_photo_file_id VARCHAR(255) NULL,
    reference_discount_amount BIGINT NOT NULL DEFAULT 0,
    synced_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS telegram_accounts_cache (
    telegram_user_id BIGINT NOT NULL PRIMARY KEY,
    user_id INT NULL,
    mobile VARCHAR(20) NULL,
    mobile_verified_at DATETIME NULL,
    display_name VARCHAR(191) NULL,
    verification_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
    is_bot_admin TINYINT(1) NOT NULL DEFAULT 0,
    snapshot_revision VARCHAR(64) NULL,
    owned_product_ids TEXT NULL,
    profile_json MEDIUMTEXT NULL,
    referral_json MEDIUMTEXT NULL,
    family_json MEDIUMTEXT NULL,
    owned_presents_json MEDIUMTEXT NULL,
    sat_json MEDIUMTEXT NULL,
    snapshot_synced_at DATETIME NULL,
    hot_synced_at DATETIME NULL,
    cold_synced_at DATETIME NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_accounts_cache_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conversations (
    telegram_user_id BIGINT NOT NULL PRIMARY KEY,
    state VARCHAR(64) NOT NULL DEFAULT 'idle',
    context_json TEXT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sync_meta (
    sync_key VARCHAR(64) NOT NULL PRIMARY KEY,
    synced_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Flood guard for public/webhook.php (see src/Security/RateLimiter.php).
-- 20 hits / 30s window → blocked_until = now + 60 with a user-facing notice.
CREATE TABLE IF NOT EXISTS rate_limits (
    telegram_user_id BIGINT NOT NULL PRIMARY KEY,
    window_start INT NOT NULL,
    hits INT NOT NULL DEFAULT 1,
    blocked_until INT NOT NULL DEFAULT 0,
    last_notice_at INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS membership_cache (
    telegram_user_id BIGINT NOT NULL,
    chat_id VARCHAR(64) NOT NULL,
    is_member TINYINT(1) NOT NULL DEFAULT 0,
    checked_at DATETIME NOT NULL,
    PRIMARY KEY (telegram_user_id, chat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pending_iran_updates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    update_json MEDIUMTEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_pending_iran_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pending_ticket_sync (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    payload_json MEDIUMTEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_pending_ticket_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pending_registration_sync (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    payload_json MEDIUMTEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uniq_pending_registration_user (telegram_user_id),
    INDEX idx_pending_registration_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS discount_codes_cache (
    code VARCHAR(64) NOT NULL PRIMARY KEY,
    discount_type VARCHAR(32) NOT NULL DEFAULT 'percent',
    discount_value INT NOT NULL DEFAULT 0,
    max_discount_amount INT NULL,
    min_order_amount INT NULL,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    max_uses INT NULL,
    uses_reserved INT NOT NULL DEFAULT 0,
    max_uses_per_user INT NULL,
    restriction VARCHAR(64) NOT NULL DEFAULT 'all',
    requires_link TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    product_ids_json TEXT NULL,
    synced_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS destinations_cache (
    id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT '',
    chat_id VARCHAR(64) NOT NULL DEFAULT '',
    invite_mode VARCHAR(32) NOT NULL DEFAULT 'shared',
    shared_invite_url TEXT NULL,
    product_ids_json TEXT NULL,
    product_titles_json TEXT NULL,
    sat_membership TINYINT(1) NOT NULL DEFAULT 0,
    synced_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pending_membership_sync (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    payload_json MEDIUMTEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_pending_membership_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Access pushed from Iran by mobile number, before the buyer ever starts the
-- bot (e.g. bought a course/seminar on the website only). Merged into
-- telegram_accounts_cache the moment the user shares their phone at /start.
CREATE TABLE IF NOT EXISTS telegram_pending_access_by_mobile (
    mobile VARCHAR(20) NOT NULL PRIMARY KEY,
    owned_product_ids TEXT NULL,
    display_name VARCHAR(191) NULL,
    user_id BIGINT UNSIGNED NULL,
    verification_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
    snapshot_json MEDIUMTEXT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Local support threads (user ↔ reports group) — no Iran dependency.
CREATE TABLE IF NOT EXISTS support_message_maps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    direction VARCHAR(32) NOT NULL,
    source_chat_id VARCHAR(64) NOT NULL,
    source_message_id BIGINT NOT NULL,
    target_chat_id VARCHAR(64) NOT NULL,
    target_message_id BIGINT NOT NULL,
    target_thread_id BIGINT NULL,
    forward_message_id BIGINT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_support_map_target (direction, target_chat_id, target_message_id),
    INDEX idx_support_map_source (direction, source_chat_id, source_message_id),
    INDEX idx_support_map_forward (target_chat_id, forward_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Support user→reports forward queue (drained after webhook ACK).
CREATE TABLE IF NOT EXISTS pending_support_forward (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    payload_json MEDIUMTEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_pending_support_fwd_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
