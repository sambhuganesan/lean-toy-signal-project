CREATE DATABASE IF NOT EXISTS toy_signal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE toy_signal;

CREATE TABLE IF NOT EXISTS scenarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  users_json JSON NOT NULL,
  messages_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX scenarios_created_at_idx (created_at)
) ENGINE=InnoDB;
