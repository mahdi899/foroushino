CREATE TABLE IF NOT EXISTS pending_iran_updates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    update_json MEDIUMTEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_pending_iran_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
