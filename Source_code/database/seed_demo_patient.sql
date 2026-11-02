-- Tài khoản bệnh nhân demo dùng cho môi trường local/test.
-- Email: benhnhan.demo@medsched.vn
-- Mật khẩu: Medsched@123
-- Script có thể chạy lại an toàn nhờ ON DUPLICATE KEY UPDATE.

USE medsched_db;
SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO users (
    id,
    email,
    password_hash,
    full_name,
    phone,
    is_active
)
VALUES (
    'e1b2c3d4-0007-4000-8000-000000000007',
    'benhnhan.demo@medsched.vn',
    '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti',
    'Nguyễn Văn An',
    '0912345678',
    TRUE
)
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    full_name = VALUES(full_name),
    phone = VALUES(phone),
    is_active = TRUE;

INSERT INTO patient_profiles (
    id,
    user_id,
    relationship,
    full_name,
    cccd_number,
    health_insurance_no,
    date_of_birth,
    gender,
    phone,
    address,
    medical_history
)
VALUES (
    '20b2c3d4-0001-4000-8000-000000000001',
    'e1b2c3d4-0007-4000-8000-000000000007',
    'SELF',
    'Nguyễn Văn An',
    '079123456789',
    'DN4012345678901',
    '1995-05-20',
    'MALE',
    '0912345678',
    '123 Nguyễn Trãi, Phường Bến Thành, TP. Hồ Chí Minh',
    'Không có tiền sử bệnh lý đáng chú ý.'
)
ON DUPLICATE KEY UPDATE
    user_id = VALUES(user_id),
    relationship = VALUES(relationship),
    full_name = VALUES(full_name),
    cccd_number = VALUES(cccd_number),
    health_insurance_no = VALUES(health_insurance_no),
    date_of_birth = VALUES(date_of_birth),
    gender = VALUES(gender),
    phone = VALUES(phone),
    address = VALUES(address),
    medical_history = VALUES(medical_history);

COMMIT;
