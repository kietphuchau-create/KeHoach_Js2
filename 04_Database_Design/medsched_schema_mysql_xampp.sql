-- ====================================================================
-- CƠ SỞ DỮ LIỆU DỰ ÁN MEDSCHED - PHIÊN BẢN MYSQL / MARIADB (XAMPP)
-- Hệ quản trị: MariaDB 10.4+ / MySQL 8.0+ (đi kèm XAMPP, chạy qua phpMyAdmin)
-- Đây là bản chuyển đổi tương đương 1-1 của "medsched_schema.sql" (PostgreSQL)
-- sang cú pháp MySQL/MariaDB để nhóm chạy nhanh trên máy cá nhân (Windows +
-- XAMPP) khi không có Docker/PostgreSQL, phục vụ demo offline & chấm điểm.
--
-- Bảng quy đổi kiểu dữ liệu Postgres -> MySQL áp dụng trong file này:
--   UUID                      -> CHAR(36)            (sinh giá trị bằng UUID())
--   TIMESTAMP WITH TIME ZONE  -> DATETIME             (lưu giờ theo múi giờ server, quy ước UTC+7)
--   NOW()                     -> CURRENT_TIMESTAMP
--   NUMERIC(19,2)             -> DECIMAL(19,2)
--   BOOLEAN                   -> BOOLEAN (MySQL/MariaDB tự map sang TINYINT(1))
--   CHECK (...)               -> giữ nguyên (được thực thi trên MariaDB >= 10.2.1 / MySQL >= 8.0.16)
--
-- Yêu cầu tối thiểu: MariaDB 10.4+ (bản đi kèm XAMPP 8.x hiện hành) hoặc
-- MySQL 8.0.16+. Nếu dự án dùng bản MySQL cũ hơn (5.6/5.7 trong XAMPP cũ),
-- CHECK sẽ bị bỏ qua âm thầm và cột id nên để tầng ứng dụng (Spring Boot/
-- Hibernate sinh UUID.randomUUID() trước khi insert) tự đảm nhiệm thay vì
-- phụ thuộc DEFAULT (UUID()).
-- ====================================================================

CREATE DATABASE IF NOT EXISTS medsched_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medsched_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS doctor_reviews;
DROP TABLE IF EXISTS medical_records;
DROP TABLE IF EXISTS appointment_status_logs;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS time_slots;
DROP TABLE IF EXISTS doctor_schedules;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS specialties;
DROP TABLE IF EXISTS patient_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS medical_centers;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. BẢNG CƠ SỞ Y TẾ / CHI NHÁNH (HỖ TRỢ MỞ RỘNG SAAS / MULTI-TENANT)
CREATE TABLE medical_centers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG CẤU HÌNH HỆ THỐNG (SYSTEM SETTINGS - TRÁNH HARDCODE TRONG SCHEDULE)
CREATE TABLE system_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    medical_center_id CHAR(36),
    setting_key VARCHAR(100) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT uq_center_setting UNIQUE (medical_center_id, setting_key),
    CONSTRAINT fk_settings_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG TÀI KHOẢN NGƯỜI DÙNG & XÁC THỰC
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    medical_center_id CHAR(36),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(32) NOT NULL CHECK (role IN ('ROLE_PATIENT', 'ROLE_DOCTOR', 'ROLE_STAFF', 'ROLE_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT fk_users_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG HỒ SƠ BỆNH NHÂN (HỖ TRỢ ĐẶT LỊCH HỘ CHO NGƯỜI THÂN / FAMILY PROFILES)
CREATE TABLE patient_profiles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    relationship VARCHAR(30) NOT NULL DEFAULT 'SELF' CHECK (relationship IN ('SELF', 'PARENT', 'CHILD', 'SPOUSE', 'OTHER')),
    full_name VARCHAR(255) NOT NULL,
    cccd_number VARCHAR(20),
    health_insurance_no VARCHAR(30),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    phone VARCHAR(20),
    address VARCHAR(500),
    medical_history TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX idx_patient_profiles_cccd ON patient_profiles(cccd_number);

-- 5. BẢNG CHUYÊN KHOA Y TẾ
CREATE TABLE specialties (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    medical_center_id CHAR(36),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT uq_center_specialty UNIQUE (medical_center_id, code),
    CONSTRAINT fk_specialties_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG HỒ SƠ BÁC SĨ
CREATE TABLE doctors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    specialty_id CHAR(36) NOT NULL,
    academic_title VARCHAR(100), -- ThS, BS.CKI, PGS.TS...
    experience_years INT NOT NULL DEFAULT 1,
    consultation_fee DECIMAL(19, 2) NOT NULL DEFAULT 200000.00,
    room_number VARCHAR(50),
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_doctors_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG LỊCH ĐĂNG KÝ LÀM VIỆC CỦA BÁC SĨ (CÓ TRẠNG THÁI KHẨN CẤP / NGHỈ ĐỘT XUẤT)
CREATE TABLE doctor_schedules (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id CHAR(36) NOT NULL,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT, -- NULL nếu kế thừa từ system_settings
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED_EMERGENCY', 'COMPLETED')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT fk_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BẢNG KHUNG GIỜ KHÁM (TIME SLOTS) - CHỐNG TRÙNG LỊCH BẰNG OPTIMISTIC LOCKING
CREATE TABLE time_slots (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    schedule_id CHAR(36) NOT NULL,
    doctor_id CHAR(36) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'LOCKED', 'BLOCKED')),
    version INT NOT NULL DEFAULT 0, -- Khóa lạc quan (Optimistic Locking) chống Race Condition
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT fk_slots_schedule FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_time_slots_doctor_date ON time_slots(doctor_id, start_time);

-- 9. BẢNG CA HẸN ĐẶT LỊCH KHÁM (HỖ TRỢ ĐIỀU PHỐI HÀNG ĐỢI & THANH TOÁN)
CREATE TABLE appointments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_code VARCHAR(16) NOT NULL UNIQUE, -- Mã đặt hẹn (sinh QR)
    patient_profile_id CHAR(36) NOT NULL,
    doctor_id CHAR(36) NOT NULL,
    slot_id CHAR(36), -- Có thể NULL đối với khách vãng lai cấp số chờ
    queue_number VARCHAR(20) NOT NULL, -- Số thứ tự hàng đợi (vd: APP-1000, WLK-001, LAB-01)
    queue_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE_BOOKED' CHECK (queue_type IN ('ONLINE_BOOKED', 'WALKIN', 'POST_LAB_RESULT')),
    patient_symptoms TEXT, -- Triệu chứng bệnh nhân mô tả
    ai_summary TEXT, -- Bản tóm tắt 2 dòng do Spring AI trích xuất
    checkin_method VARCHAR(30) CHECK (checkin_method IN ('QR_CODE', 'CCCD_QR', 'MANUAL')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID_AT_COUNTER', 'DEPOSITED_VNPAY', 'REFUNDED')),
    payment_amount DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN (
        'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS',
        'WAITING_FOR_LAB_RESULTS', 'COMPLETED', 'CANCELLED', 'MISSED_NO_SHOW'
    )),
    is_delayed BOOLEAN NOT NULL DEFAULT FALSE, -- Báo ca trước kéo dài
    delay_minutes INT NOT NULL DEFAULT 0,
    check_in_time DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT fk_appt_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_slot FOREIGN KEY (slot_id) REFERENCES time_slots(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_appointments_patient ON appointments(patient_profile_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_queue ON appointments(doctor_id, queue_type, status);

-- 10. BẢNG NHẬT KÝ LỊCH SỬ THAY ĐỔI TRẠNG THÁI CA KHÁM (AUDIT STATUS LOGS)
CREATE TABLE appointment_status_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id CHAR(36) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    reason TEXT, -- Lý do hủy, dời lịch, hoặc bác sĩ đi cấp cứu
    changed_by CHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_user FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_status_logs_appointment ON appointment_status_logs(appointment_id);

-- 11. BẢNG HỒ SƠ BỆNH ÁN & KẾT QUẢ KHÁM BỆNH
CREATE TABLE medical_records (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id CHAR(36) NOT NULL UNIQUE,
    diagnosis TEXT NOT NULL, -- Chẩn đoán bệnh
    doctor_notes TEXT, -- Lời dặn dò, chế độ theo dõi
    prescription TEXT, -- Toa thuốc / thuốc chỉ định
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT fk_records_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. BẢNG ĐÁNH GIÁ CHẤT LƯỢNG BÁC SĨ (VERIFIED REVIEWS & SPRING AI SENTIMENT)
CREATE TABLE doctor_reviews (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id CHAR(36) NOT NULL UNIQUE,
    patient_profile_id CHAR(36) NOT NULL,
    doctor_id CHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), -- Điểm 1 đến 5 sao
    comment TEXT, -- Nhận xét của bệnh nhân
    ai_sentiment VARCHAR(20) CHECK (ai_sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')), -- Spring AI phân tích cảm xúc
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    updated_by CHAR(36),
    CONSTRAINT fk_reviews_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_doctor_reviews_doctor ON doctor_reviews(doctor_id);

-- ====================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA CHO HỆ THỐNG MEDSCHED)
-- ====================================================================

-- 1. Cơ sở y tế mẫu
INSERT INTO medical_centers (id, code, name, address, phone) VALUES
('00000000-0000-0000-0000-000000000001', 'MED_Q1', 'Bệnh Viện Đa Khoa MedSched - Chi Nhánh Quận 1', 'Số 123 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1, TP.HCM', '02839123456');

-- 2. Cấu hình hệ thống (Settings)
INSERT INTO system_settings (medical_center_id, setting_key, setting_value, description) VALUES
('00000000-0000-0000-0000-000000000001', 'DEFAULT_SLOT_DURATION_MINUTES', '30', 'Thời lượng khám mặc định cho mỗi ca'),
('00000000-0000-0000-0000-000000000001', 'BUFFER_TIME_MINUTES', '5', 'Thời gian chuẩn bị giữa 2 ca khám'),
('00000000-0000-0000-0000-000000000001', 'CANCELLATION_LIMIT_HOURS', '2', 'Cho phép hủy lịch hẹn trước tối thiểu 2 giờ'),
('00000000-0000-0000-0000-000000000001', 'MAX_NO_SHOW_PENALTY', '3', 'Số lần bỏ hẹn tối đa trước khi bị hạn chế đặt online');

-- 3. Chuyên khoa
INSERT INTO specialties (id, medical_center_id, name, code, description) VALUES
('55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Da liễu', 'DERMATOLOGY', 'Chẩn đoán và điều trị bệnh ngoài da, mẩn ngứa, viêm da dị ứng'),
('55555555-5555-5555-5555-555555555552', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Nội tổng quát', 'INTERNAL_MEDICINE', 'Khám nội khoa người lớn, tim mạch, huyết áp, tiêu hóa'),
('55555555-5555-5555-5555-555555555553', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Răng Hàm Mặt', 'ODONTO_STOMATOLOGY', 'Chăm sóc, điều trị và phục hình răng miệng'),
('55555555-5555-5555-5555-555555555554', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Mắt', 'OPHTHALMOLOGY', 'Khám thị lực và điều trị khúc xạ, bệnh lý mắt');

-- 4. Tài khoản người dùng mẫu
INSERT INTO users (id, medical_center_id, email, password_hash, full_name, phone, role) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'dr.minhanh@medsched.vn', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'BS.CKII Nguyễn Minh Anh', '0901234567', 'ROLE_DOCTOR'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'benhnhan.demo@gmail.com', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'Trần Văn Hoàng', '0912345678', 'ROLE_PATIENT'),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'letan.q1@medsched.vn', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'Lễ Tân Tiếp Đón 01', '0988776655', 'ROLE_STAFF');

-- 5. Bác sĩ mẫu
INSERT INTO doctors (id, user_id, specialty_id, academic_title, experience_years, consultation_fee, room_number, bio) VALUES
('44444444-4444-4444-4444-444444444441',
 '11111111-1111-1111-1111-111111111111',
 '55555555-5555-5555-5555-555555555551',
 'BS.CKII', 15, 300000.00, 'P.205', 'Chuyên gia đầu ngành Da liễu với hơn 15 năm kinh nghiệm điều trị.');

-- 6. Hồ sơ bệnh nhân mẫu (Chính chủ & Người thân)
INSERT INTO patient_profiles (id, user_id, relationship, full_name, cccd_number, health_insurance_no, date_of_birth, gender, phone, address, medical_history) VALUES
('66666666-6666-6666-6666-666666666661',
 '22222222-2222-2222-2222-222222222222', 'SELF',
 'Trần Văn Hoàng', '079201008899', 'DN4790123456789', '2001-05-12', 'MALE', '0912345678', 'Quận 1, TP.HCM', 'Dị ứng phấn hoa nhẹ'),
('66666666-6666-6666-6666-666666666662',
 '22222222-2222-2222-2222-222222222222', 'PARENT',
 'Trần Văn Bảy (Bố)', '079060001234', 'GD4790987654321', '1960-03-20', 'MALE', '0912345678', 'Quận 1, TP.HCM', 'Tiền sử tăng huyết áp và đái tháo đường type 2');
