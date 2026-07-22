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
    synced_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS telegram_accounts_cache (
    telegram_user_id BIGINT NOT NULL PRIMARY KEY,
    user_id INT NULL,
    mobile VARCHAR(20) NULL,
    mobile_verified_at DATETIME NULL,
    display_name VARCHAR(191) NULL,
    is_bot_admin TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL
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
