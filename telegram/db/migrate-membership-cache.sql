-- Optional: run on external host if table missing
CREATE TABLE IF NOT EXISTS membership_cache (
    telegram_user_id BIGINT NOT NULL,
    chat_id VARCHAR(64) NOT NULL,
    is_member TINYINT(1) NOT NULL DEFAULT 0,
    checked_at DATETIME NOT NULL,
    PRIMARY KEY (telegram_user_id, chat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
