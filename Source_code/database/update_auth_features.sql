-- Migration: Bổ sung tính năng Forgot/Reset Password và Server-side Logout Revocation
USE medsched_db;

-- 1. Thêm cột token_invalid_before vào bảng users để vô hiệu hoá tất cả token/session cũ khi đổi mật khẩu
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS token_invalid_before DATETIME NULL AFTER is_active;

-- 2. Tạo bảng lưu token đặt lại mật khẩu (dùng 1 lần, có thời hạn)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prt_hash (token_hash),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tạo bảng lưu token đã bị thu hồi khi đăng xuất (Server-side Invalidation)
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_type VARCHAR(16) NOT NULL,
    user_id CHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_revoked_hash (token_hash),
    INDEX idx_revoked_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
