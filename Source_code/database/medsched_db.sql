-- TECHNICAL NOTE (CLAB-102): key columns must be VARCHAR(36), never CHAR(36).
-- The JPA entities declare @Column(length = 36), which Hibernate maps to
-- varchar(36). If this script creates CHAR(36) columns, Hibernate tries to ALTER
-- them and MySQL refuses because they are referenced by foreign keys, so the
-- application FAILS TO START.
-- ====================================================================
-- CƠ SỞ DỮ LIỆU DỰ ÁN MEDSCHED - MYSQL / MARIADB (XAMPP)
-- Hệ quản trị CHÍNH THỨC của đồ án: MySQL/MariaDB đi kèm XAMPP (phpMyAdmin).
--
-- PHIÊN BẢN 3.1 - 17 BẢNG
--   Bản 3.0 sửa 3 lỗi thiết kế được phản biện:
--     [1] users KHÔNG còn medical_center_id / role -> tài khoản là danh tính
--         TOÀN CỤC, 1 bệnh nhân dùng 1 account đi khám ở mọi chi nhánh; quyền
--         nhân sự tách sang bảng nối user_medical_center_roles theo chi nhánh.
--     [2] Thêm bảng payments đúng nghĩa (nhiều lần thu, hoàn tiền, mã giao dịch).
--     [3] Thêm medicines + prescription_items thay cột prescription TEXT.
--   Bản 3.1 thêm bảng services (bảng giá dịch vụ khám của từng chuyên khoa)
--   phục vụ chức năng CRUD dịch vụ của Admin trong Task 1.
--
-- CÁCH NẠP: XAMPP Control Panel -> Start MySQL -> http://localhost/phpmyadmin
--           -> tab Import -> chọn file này -> Go. File tự tạo database medsched_db.
--
-- Yêu cầu tối thiểu: MariaDB 10.4+ (bản trong XAMPP 8.x) hoặc MySQL 8.0.16+
-- để ràng buộc CHECK được thực thi thật.
-- ====================================================================

CREATE DATABASE IF NOT EXISTS medsched_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medsched_db;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS revoked_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS doctor_reviews;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS prescription_items;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS medicines;
DROP TABLE IF EXISTS medical_records;
DROP TABLE IF EXISTS appointment_status_logs;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS time_slots;
DROP TABLE IF EXISTS doctor_schedules;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS specialties;
DROP TABLE IF EXISTS patient_profiles;
DROP TABLE IF EXISTS user_medical_center_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS medical_centers;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. CƠ SỞ Y TẾ / CHI NHÁNH (HỖ TRỢ MỞ RỘNG SAAS / MULTI-TENANT)
CREATE TABLE medical_centers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CẤU HÌNH HỆ THỐNG (medical_center_id NULL = cấu hình mặc định toàn hệ thống)
CREATE TABLE system_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    medical_center_id VARCHAR(36),
    setting_key VARCHAR(100) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_center_setting UNIQUE (medical_center_id, setting_key),
    CONSTRAINT fk_settings_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TÀI KHOẢN NGƯỜI DÙNG - DANH TÍNH TOÀN CỤC, KHÔNG THUỘC CHI NHÁNH NÀO
-- Không có cột role: mọi tài khoản đều mặc định đặt lịch khám được ở mọi chi
-- nhánh (vai trò bệnh nhân). Quyền nhân sự nằm ở user_medical_center_roles.
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    current_session_id VARCHAR(64),
    token_invalid_before DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3b. TOKEN ĐẶT LẠI MẬT KHẨU (FORGOT / RESET PASSWORD - SINGLE USE, 15 PHÚT)
CREATE TABLE password_reset_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prt_hash (token_hash),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3c. DANH SÁCH TOKEN BỊ THU HỒI KHI ĐĂNG XUẤT (SERVER-SIDE LOGOUT INVALIDATION)
CREATE TABLE revoked_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_type VARCHAR(16) NOT NULL,
    user_id CHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_revoked_hash (token_hash),
    INDEX idx_revoked_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PHÂN QUYỀN NHÂN SỰ THEO TỪNG CHI NHÁNH (BẢNG NỐI N-N)
-- 1 bác sĩ có thể trực ở nhiều chi nhánh -> nhiều dòng. ROLE_PATIENT cố ý
-- KHÔNG có trong danh sách vì đó là quyền mặc định của mọi tài khoản.
CREATE TABLE user_medical_center_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    medical_center_id VARCHAR(36) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('ROLE_DOCTOR', 'ROLE_STAFF', 'ROLE_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_user_center_role UNIQUE (user_id, medical_center_id, role),
    CONSTRAINT fk_ucr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ucr_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ucr_user ON user_medical_center_roles(user_id);
CREATE INDEX idx_ucr_center_role ON user_medical_center_roles(medical_center_id, role);

-- 5. HỒ SƠ NGƯỜI KHÁM (TOÀN CỤC THEO TÀI KHOẢN, DÙNG Ở MỌI CHI NHÁNH)
CREATE TABLE patient_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
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
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX idx_patient_profiles_cccd ON patient_profiles(cccd_number);

-- 6. CHUYÊN KHOA (LUÔN THUỘC 1 CHI NHÁNH)
CREATE TABLE specialties (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    medical_center_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_center_specialty UNIQUE (medical_center_id, code),
    CONSTRAINT fk_specialties_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. DANH MỤC DỊCH VỤ KHÁM CỦA TỪNG CHUYÊN KHOA (BẢNG GIÁ)
CREATE TABLE services (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    specialty_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(19, 2) NOT NULL,
    estimated_duration_minutes INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_specialty_service UNIQUE (specialty_id, code),
    CONSTRAINT chk_service_price CHECK (price >= 0),
    CONSTRAINT chk_service_duration CHECK (estimated_duration_minutes > 0),
    CONSTRAINT fk_services_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. HỒ SƠ BÁC SĨ
-- UNIQUE(user_id, specialty_id) thay cho UNIQUE(user_id): 1 người có thể hành
-- nghề ở nhiều chuyên khoa / nhiều chi nhánh (specialty đã gắn medical_center).
CREATE TABLE doctors (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    specialty_id VARCHAR(36) NOT NULL,
    academic_title VARCHAR(100),
    consultation_fee DECIMAL(19, 2) NOT NULL DEFAULT 200000.00,
    room_number VARCHAR(50),
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_doctors_user_specialty UNIQUE (user_id, specialty_id),
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_doctors_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_doctors_user ON doctors(user_id);

-- 9. LỊCH ĐĂNG KÝ LÀM VIỆC CỦA BÁC SĨ
CREATE TABLE doctor_schedules (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id VARCHAR(36) NOT NULL,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED_EMERGENCY', 'COMPLETED')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. KHUNG GIỜ KHÁM - CHỐNG TRÙNG LỊCH BẰNG OPTIMISTIC LOCKING
CREATE TABLE time_slots (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    schedule_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'LOCKED', 'BLOCKED')),
    version INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_slots_schedule FOREIGN KEY (schedule_id) REFERENCES doctor_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_time_slots_doctor_date ON time_slots(doctor_id, start_time);

-- 11. CA HẸN KHÁM
-- medical_center_id: ghi rõ ca khám này diễn ra ở CHI NHÁNH NÀO. Vì users đã
-- toàn cục, đây là chỗ duy nhất cho biết bệnh nhân đến khám ở đâu -> 1 tài
-- khoản có thể có ca khám ở nhiều chi nhánh khác nhau.
-- Không còn payment_status / payment_amount: xem bảng payments (mục 15).
CREATE TABLE appointments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_code VARCHAR(16) NOT NULL UNIQUE,
    medical_center_id VARCHAR(36) NOT NULL,
    patient_profile_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36),
    queue_number VARCHAR(20) NOT NULL,
    queue_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE_BOOKED' CHECK (queue_type IN ('ONLINE_BOOKED', 'WALKIN', 'POST_LAB_RESULT')),
    patient_symptoms TEXT,
    ai_summary TEXT,
    checkin_method VARCHAR(30) CHECK (checkin_method IN ('QR_CODE', 'CCCD_QR', 'MANUAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN (
        'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS',
        'WAITING_FOR_LAB_RESULTS', 'COMPLETED', 'CANCELLED', 'MISSED_NO_SHOW'
    )),
    is_delayed BOOLEAN NOT NULL DEFAULT FALSE,
    delay_minutes INT NOT NULL DEFAULT 0,
    check_in_time DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_appt_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_slot FOREIGN KEY (slot_id) REFERENCES time_slots(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_appointments_patient ON appointments(patient_profile_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_queue ON appointments(doctor_id, queue_type, status);
CREATE INDEX idx_appointments_center_date ON appointments(medical_center_id, created_at);

-- 12. NHẬT KÝ THAY ĐỔI TRẠNG THÁI CA KHÁM
CREATE TABLE appointment_status_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    reason TEXT,
    changed_by VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_user FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_status_logs_appointment ON appointment_status_logs(appointment_id);

-- 13. HỒ SƠ BỆNH ÁN (KẾT LUẬN KHÁM) - đơn thuốc xem prescription_items
CREATE TABLE medical_records (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    diagnosis TEXT NOT NULL,
    doctor_notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_records_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. DANH MỤC THUỐC CỦA CHI NHÁNH
CREATE TABLE medicines (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    medical_center_id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    unit VARCHAR(30) NOT NULL DEFAULT 'VIÊN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_center_medicine UNIQUE (medical_center_id, code),
    CONSTRAINT fk_medicines_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. ĐƠN THUỐC ĐIỆN TỬ (CLAB-107)
CREATE TABLE prescriptions (
    id VARCHAR(64) PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL,
    medical_record_id VARCHAR(36),
    doctor_id VARCHAR(36),
    doctor_name VARCHAR(255),
    total_medicine_amount DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prescriptions_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. TỪNG DÒNG THUỐC TRONG ĐƠN (THAY CHO medical_records.prescription TEXT)
CREATE TABLE prescription_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    prescription_id VARCHAR(36),
    medical_record_id VARCHAR(36) NOT NULL,
    medicine_id VARCHAR(36),
    medicine_name VARCHAR(255) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration_days INT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(19, 2),
    instruction VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT chk_item_quantity CHECK (quantity > 0),
    CONSTRAINT chk_item_duration CHECK (duration_days IS NULL OR duration_days > 0),
    CONSTRAINT fk_items_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_prescription_items_record ON prescription_items(medical_record_id);
CREATE INDEX idx_prescription_items_rx ON prescription_items(prescription_id);

-- 17. HÓA ĐƠN VIỆN PHÍ (CLAB-108)
CREATE TABLE invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(32) NOT NULL UNIQUE,
    appointment_id VARCHAR(36) NOT NULL,
    patient_profile_id VARCHAR(36),
    doctor_id VARCHAR(36),
    consultation_fee DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    medicine_amount DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(30),
    note VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at DATETIME,
    CONSTRAINT fk_invoices_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. THANH TOÁN (THAY CHO 2 CỘT payment_status / payment_amount)
-- 1 ca hẹn có thể có NHIỀU dòng: đặt cọc online + thu thêm tại quầy, hoặc
-- lần trả thất bại rồi trả lại. transaction_ref UNIQUE là chốt chống webhook
-- cổng thanh toán gọi lặp làm ghi nhận/hoàn tiền 2 lần (kịch bản 7.8).
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id VARCHAR(36) NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    method VARCHAR(30) NOT NULL CHECK (method IN ('CASH', 'CARD', 'VNPAY', 'MOMO', 'BANK_TRANSFER')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
    transaction_ref VARCHAR(100),
    paid_at DATETIME,
    refunded_amount DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    refunded_at DATETIME,
    refund_ref VARCHAR(100),
    collected_by VARCHAR(36),
    note VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_payment_txn UNIQUE (transaction_ref),
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_refund CHECK (refunded_amount >= 0 AND refunded_amount <= amount),
    CONSTRAINT fk_payments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_collector FOREIGN KEY (collected_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 17. ĐÁNH GIÁ BÁC SĨ (VERIFIED REVIEW & SPRING AI SENTIMENT)
CREATE TABLE doctor_reviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    patient_profile_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    ai_sentiment VARCHAR(20) CHECK (ai_sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_reviews_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_doctor_reviews_doctor ON doctor_reviews(doctor_id);

-- ====================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA CHO HỆ THỐNG MEDSCHED)
-- Mật khẩu của mọi tài khoản mẫu: Medsched@123
-- ====================================================================

-- [1] Hai chi nhánh
INSERT INTO medical_centers (id, code, name, address, phone) VALUES
('a1b2c3d4-0001-4000-8000-000000000001', 'MED_Q1', 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1', 'Số 123 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1, TP.HCM', '02839123456'),
('a1b2c3d4-0002-4000-8000-000000000002', 'MED_Q7', 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 7', 'Số 45 Nguyễn Thị Thập, P. Tân Phú, Q.7, TP.HCM', '02839998877');

INSERT INTO system_settings (id, medical_center_id, setting_key, setting_value, description) VALUES
('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'DEFAULT_SLOT_DURATION_MINUTES', '30', 'Thời lượng khám mặc định cho mỗi ca'),
('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'BUFFER_TIME_MINUTES', '5', 'Thời gian chuẩn bị giữa 2 ca khám'),
('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'CANCELLATION_LIMIT_HOURS', '2', 'Cho phép hủy lịch hẹn trước tối thiểu 2 giờ'),
('b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001', 'MAX_NO_SHOW_PENALTY', '3', 'Số lần bỏ hẹn tối đa trước khi bị hạn chế đặt online');

INSERT INTO specialties (id, medical_center_id, name, code, description) VALUES
('c1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'Chuyên khoa Da liễu', 'DERMATOLOGY', 'Chẩn đoán và điều trị bệnh ngoài da, mẩn ngứa, viêm da dị ứng'),
('c1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'Chuyên khoa Nội tổng quát', 'INTERNAL_MEDICINE', 'Khám nội khoa người lớn, tim mạch, huyết áp, tiêu hóa'),
('c1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'Chuyên khoa Răng Hàm Mặt', 'ODONTO_STOMATOLOGY', 'Chăm sóc, điều trị và phục hình răng miệng'),
('c1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001', 'Chuyên khoa Mắt', 'OPHTHALMOLOGY', 'Khám thị lực và điều trị khúc xạ, bệnh lý mắt'),
('c1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0002-4000-8000-000000000002', 'Chuyên khoa Da liễu', 'DERMATOLOGY', 'Khoa Da liễu chi nhánh Quận 7');

-- Danh mục dịch vụ khám (bảng giá) của từng chuyên khoa
INSERT INTO services (id, specialty_id, name, code, description, price, estimated_duration_minutes) VALUES
('d1b2c3d4-0001-4000-8000-000000000001', 'c1b2c3d4-0001-4000-8000-000000000001', 'Khám Da liễu cơ bản', 'DERM_BASIC', 'Khám và tư vấn các bệnh da liễu thông thường', 300000.00, 30),
('d1b2c3d4-0002-4000-8000-000000000002', 'c1b2c3d4-0001-4000-8000-000000000001', 'Điều trị Laser vết nám', 'DERM_LASER', 'Điều trị nám, tàn nhang bằng công nghệ laser', 1200000.00, 45),
('d1b2c3d4-0003-4000-8000-000000000003', 'c1b2c3d4-0002-4000-8000-000000000002', 'Khám Nội tổng quát', 'INT_BASIC', 'Khám nội khoa tổng quát, đo huyết áp, tư vấn dinh dưỡng', 250000.00, 30);

-- Tài khoản người dùng hệ thống.
-- Mật khẩu của TẤT CẢ tài khoản mẫu: Medsched@123 (hash BCrypt cost 10: $2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti).
INSERT INTO users (id, email, password_hash, full_name, phone) VALUES
('e1b2c3d4-0001-4000-8000-000000000001', 'admin@medsched.vn', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Quản Trị Viên Hệ Thống', '0900000001'),
('e1b2c3d4-0002-4000-8000-000000000002', 'dr.minhanh@medsched.vn', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'BS.CKII Nguyễn Minh Anh', '0901234567'),
('e1b2c3d4-0003-4000-8000-000000000003', 'dr.tranhung@medsched.vn', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'PGS.TS Trần Văn Hùng', '0902345678'),
('e1b2c3d4-0004-4000-8000-000000000004', 'letan.q1@medsched.vn', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Lễ Tân Tiếp Đón 01', '0988776655'),
('e1b2c3d4-0005-4000-8000-000000000005', 'benhnhan.demo@gmail.com', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Trần Văn Hoàng', '0912345678'),
('e1b2c3d4-0006-4000-8000-000000000006', 'lethithuha@gmail.com', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Lê Thị Thu Hà', '0923456789'),
('e1b2c3d4-0007-4000-8000-000000000007', 'nguyenquocbao@gmail.com', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Nguyễn Quốc Bảo', '0934567890'),
('e1b2c3d4-0008-4000-8000-000000000008', 'phamminhduc@gmail.com', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Phạm Minh Đức', '0945678901'),
('e1b2c3d4-0009-4000-8000-000000000009', 'hoangmaianh@gmail.com', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Hoàng Thị Mai Anh', '0956789012'),
('e1b2c3d4-0010-4000-8000-000000000010', 'doquangvinh@gmail.com', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Đỗ Quang Vinh', '0967890123'),
('e1b2c3d4-0011-4000-8000-000000000011', 'vuthaonguyen@gmail.com', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Vũ Thảo Nguyên', '0978901234');

-- Phân quyền nhân sự theo từng cơ sở khám chữa bệnh
INSERT INTO user_medical_center_roles (id, user_id, medical_center_id, role) VALUES
('f1b2c3d4-0001-4000-8000-000000000001', 'e1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'ROLE_DOCTOR'),
('f1b2c3d4-0002-4000-8000-000000000002', 'e1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'ROLE_DOCTOR'),
('f1b2c3d4-0003-4000-8000-000000000003', 'e1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'ROLE_DOCTOR'),
('f1b2c3d4-0004-4000-8000-000000000004', 'e1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001', 'ROLE_STAFF'),
('f1b2c3d4-0005-4000-8000-000000000005', 'e1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'ROLE_ADMIN');

-- Hồ sơ hành nghề bác sĩ (1 bác sĩ có thể trực tại nhiều khoa/chi nhánh)
INSERT INTO doctors (id, user_id, specialty_id, academic_title, consultation_fee, room_number, bio) VALUES
('10b2c3d4-0001-4000-8000-000000000001', 'e1b2c3d4-0002-4000-8000-000000000002', 'c1b2c3d4-0001-4000-8000-000000000001', 'BS.CKII', 300000.00, 'P.205', 'Chuyên gia đầu ngành Da liễu với hơn 15 năm kinh nghiệm điều trị.'),
('10b2c3d4-0002-4000-8000-000000000002', 'e1b2c3d4-0010-4000-8000-000000000010', 'c1b2c3d4-0005-4000-8000-000000000005', 'ThS.BS', 250000.00, 'P.102', 'Chuyên gia Da liễu & Thẩm mỹ da tại chi nhánh Quận 7.'),
('10b2c3d4-0003-4000-8000-000000000003', 'e1b2c3d4-0003-4000-8000-000000000003', 'c1b2c3d4-0002-4000-8000-000000000002', 'PGS.TS', 350000.00, 'P.208', 'Chuyên gia Nội tổng quát, tim mạch học và rối loạn chuyển hóa.'),
('10b2c3d4-0004-4000-8000-000000000004', 'e1b2c3d4-0006-4000-8000-000000000006', 'c1b2c3d4-0005-4000-8000-000000000005', 'ThS.BS', 250000.00, 'P.102', 'Bác sĩ chuyên khoa điều trị và chăm sóc da tại Chi nhánh Quận 7.');

-- Hồ sơ thông tin bệnh nhân (Patient Profiles)
INSERT INTO patient_profiles (id, user_id, relationship, full_name, cccd_number, health_insurance_no, date_of_birth, gender, phone, address, medical_history) VALUES
('20b2c3d4-0001-4000-8000-000000000001', 'e1b2c3d4-0005-4000-8000-000000000005', 'SELF', 'Trần Văn Hoàng', '079201008899', 'DN4790123456789', '2001-05-12', 'MALE', '0912345678', 'Quận 1, TP.HCM', 'Dị ứng phấn hoa nhẹ'),
('20b2c3d4-0002-4000-8000-000000000002', 'e1b2c3d4-0005-4000-8000-000000000005', 'PARENT', 'Trần Văn Bảy (Bố)', '079060001234', 'GD4790987654321', '1960-03-20', 'MALE', '0912345678', 'Quận 1, TP.HCM', 'Tiền sử tăng huyết áp và đái tháo đường type 2'),
('20b2c3d4-0003-4000-8000-000000000003', 'e1b2c3d4-0006-4000-8000-000000000006', 'SELF', 'Lê Thị Thu Hà', '079195004321', 'DN4791950043210', '1995-08-14', 'FEMALE', '0923456789', 'Quận 3, TP.HCM', 'Da nhạy cảm, dễ kích ứng hóa mỹ phẩm'),
('20b2c3d4-0004-4000-8000-000000000004', 'e1b2c3d4-0007-4000-8000-000000000007', 'SELF', 'Nguyễn Quốc Bảo', '079088007654', 'DN4790880076541', '1988-11-25', 'MALE', '0934567890', 'Bình Thạnh, TP.HCM', 'Tiền sử dị ứng tôm cua biển'),
('20b2c3d4-0005-4000-8000-000000000005', 'e1b2c3d4-0008-4000-8000-000000000008', 'SELF', 'Phạm Minh Đức', '079192003322', 'DN4791920033222', '1992-04-10', 'MALE', '0945678901', 'Quận 10, TP.HCM', 'Chàm khô từng đợt vào mùa đông'),
('20b2c3d4-0006-4000-8000-000000000006', 'e1b2c3d4-0009-4000-8000-000000000009', 'SELF', 'Hoàng Thị Mai Anh', '079198005544', 'DN4791980055443', '1998-09-30', 'FEMALE', '0956789012', 'Tân Bình, TP.HCM', 'Không có tiền sử bệnh lý mạn tính'),
('20b2c3d4-0007-4000-8000-000000000007', 'e1b2c3d4-0010-4000-8000-000000000010', 'SELF', 'Đỗ Quang Vinh', '079085002211', 'DN4790850022114', '1985-02-18', 'MALE', '0967890123', 'Phú Nhuận, TP.HCM', 'Vảy nến da đầu thể mảng 5 năm'),
('20b2c3d4-0008-4000-8000-000000000008', 'e1b2c3d4-0011-4000-8000-000000000011', 'SELF', 'Vũ Thảo Nguyên', '079203009988', 'DN4792030099885', '2003-12-05', 'FEMALE', '0978901234', 'Gò Vấp, TP.HCM', 'Viêm mũi dị ứng thời tiết');

-- Lịch trực bác sĩ trong ngày hiện tại (2026-09-21)
INSERT INTO doctor_schedules (id, doctor_id, work_date, start_time, end_time, slot_duration_minutes, status) VALUES
('30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21', '08:00:00', '12:00:00', 30, 'ACTIVE'),
('30b2c3d4-0002-4000-8000-000000000002', '10b2c3d4-0002-4000-8000-000000000002', '2026-09-21', '13:30:00', '17:00:00', 30, 'ACTIVE'),
('30b2c3d4-0003-4000-8000-000000000003', '10b2c3d4-0003-4000-8000-000000000003', '2026-09-21', '08:00:00', '12:00:00', 30, 'ACTIVE');

-- Khung giờ khám (Time Slots) ngày 2026-09-21 cho BS.CKII Nguyễn Minh Anh (Phòng P.205 - Q1)
INSERT INTO time_slots (id, schedule_id, doctor_id, start_time, end_time, status) VALUES
('40b2c3d4-0001-4000-8000-000000000001', '30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21 08:00:00', '2026-09-21 08:30:00', 'BOOKED'),
('40b2c3d4-0002-4000-8000-000000000002', '30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21 08:30:00', '2026-09-21 09:00:00', 'BOOKED'),
('40b2c3d4-0003-4000-8000-000000000003', '30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21 09:00:00', '2026-09-21 09:30:00', 'BOOKED'),
('40b2c3d4-0004-4000-8000-000000000004', '30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21 09:30:00', '2026-09-21 10:00:00', 'BOOKED'),
('40b2c3d4-0005-4000-8000-000000000005', '30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21 10:00:00', '2026-09-21 10:30:00', 'BOOKED'),
('40b2c3d4-0006-4000-8000-000000000006', '30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21 10:30:00', '2026-09-21 11:00:00', 'BOOKED'),
('40b2c3d4-0007-4000-8000-000000000007', '30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21 11:00:00', '2026-09-21 11:30:00', 'BOOKED'),
('40b2c3d4-0008-4000-8000-000000000008', '30b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', '2026-09-21 11:30:00', '2026-09-21 12:00:00', 'AVAILABLE');

-- Danh sách ca khám (Appointments) chuẩn hóa quy trình phòng khám:
-- 2 ca đã hoàn tất (COMPLETED), 1 ca đang khám (IN_PROGRESS), 2 ca đã tiếp đón đang chờ (CHECKED_IN), 2 ca chưa tới (CONFIRMED)
INSERT INTO appointments (id, booking_code, medical_center_id, patient_profile_id, doctor_id, slot_id, queue_number, queue_type, patient_symptoms, ai_summary, checkin_method, status, is_delayed, delay_minutes, check_in_time, created_at) VALUES
('50b2c3d4-0001-4000-8000-000000000001', 'MS26092101', 'a1b2c3d4-0001-4000-8000-000000000001',
 '20b2c3d4-0003-4000-8000-000000000003', '10b2c3d4-0001-4000-8000-000000000001',
 '40b2c3d4-0001-4000-8000-000000000001', 'STT-01', 'ONLINE_BOOKED',
 'Ngứa rát và nổi mụn nước vùng hai mu bàn tay sau khi tiếp xúc nước tẩy rửa sàn nhà.',
 'Nữ 31 tuổi, tổn thương dạng chàm tiếp xúc cấp tính ở mu bàn tay do hóa chất tẩy rửa gia dụng.',
 'QR_CODE', 'COMPLETED', FALSE, 0, '2026-09-21 07:55:00', '2026-09-20 19:30:00'),

('50b2c3d4-0002-4000-8000-000000000002', 'MS26092102', 'a1b2c3d4-0001-4000-8000-000000000001',
 '20b2c3d4-0004-4000-8000-000000000004', '10b2c3d4-0001-4000-8000-000000000001',
 '40b2c3d4-0002-4000-8000-000000000002', 'STT-02', 'ONLINE_BOOKED',
 'Nổi sẩn phù dạng mề đay toàn thân, ngứa dữ dội sau khi ăn hải sản tối qua.',
 'Nam 38 tuổi, mề đay cấp nghi do dị ứng thức ăn (hải sản), không khó thở, không phù mạch.',
 'QR_CODE', 'COMPLETED', FALSE, 0, '2026-09-21 08:25:00', '2026-09-20 21:00:00'),

('50b2c3d4-0003-4000-8000-000000000003', 'MS26092103', 'a1b2c3d4-0001-4000-8000-000000000001',
 '20b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001',
 '40b2c3d4-0003-4000-8000-000000000003', 'STT-03', 'ONLINE_BOOKED',
 'Nổi mẩn đỏ vùng cổ và cánh tay 3 ngày, ngứa nhiều về đêm, đã tự bôi thuốc không đỡ.',
 'Nam 25 tuổi, mẩn đỏ ngứa vùng cổ và cánh tay 3 ngày, tự bôi kem chống dị ứng không thuyên giảm. Tiền sử dị ứng phấn hoa.',
 'QR_CODE', 'IN_PROGRESS', FALSE, 0, '2026-09-21 08:55:00', '2026-09-20 22:15:00'),

('50b2c3d4-0004-4000-8000-000000000004', 'MS26092104', 'a1b2c3d4-0001-4000-8000-000000000001',
 '20b2c3d4-0005-4000-8000-000000000005', '10b2c3d4-0001-4000-8000-000000000001',
 '40b2c3d4-0004-4000-8000-000000000004', 'STT-04', 'ONLINE_BOOKED',
 'Tróc vảy ngứa ở hai khuỷu tay và đầu gối kéo dài 2 tuần, da khô nứt nẻ khó chịu.',
 'Nam 34 tuổi, tổn thương vảy da mạn tính đối xứng vùng khớp, nghi viêm da cơ địa hoặc vảy nến thể mảng.',
 'MANUAL', 'CHECKED_IN', FALSE, 0, '2026-09-21 09:20:00', '2026-09-21 07:10:00'),

('50b2c3d4-0005-4000-8000-000000000005', 'MS26092105', 'a1b2c3d4-0001-4000-8000-000000000001',
 '20b2c3d4-0006-4000-8000-000000000006', '10b2c3d4-0001-4000-8000-000000000001',
 '40b2c3d4-0005-4000-8000-000000000005', 'STT-05', 'ONLINE_BOOKED',
 'Mụn viêm bọc tái phát nhiều ở hai bên má và trán, đau nhức khi chạm vào.',
 'Nữ 28 tuổi, mụn trứng cá viêm mức độ trung bình - nặng, cần tư vấn phác đồ kết hợp bôi và uống.',
 'QR_CODE', 'CHECKED_IN', FALSE, 0, '2026-09-21 09:25:00', '2026-09-21 07:45:00'),

('50b2c3d4-0006-4000-8000-000000000006', 'MS26092106', 'a1b2c3d4-0001-4000-8000-000000000001',
 '20b2c3d4-0007-4000-8000-000000000007', '10b2c3d4-0001-4000-8000-000000000001',
 '40b2c3d4-0006-4000-8000-000000000006', 'STT-06', 'ONLINE_BOOKED',
 'Tái khám định kỳ theo hẹn, kiểm tra tiến triển tổn thương vảy nến da đầu.',
 'Nam 41 tuổi, tái khám vảy nến theo lịch hẹn, mang theo đơn thuốc cũ tháng trước.',
 NULL, 'CONFIRMED', FALSE, 0, NULL, '2026-09-20 18:00:00'),

('50b2c3d4-0007-4000-8000-000000000007', 'MS26092107', 'a1b2c3d4-0001-4000-8000-000000000001',
 '20b2c3d4-0008-4000-8000-000000000008', '10b2c3d4-0001-4000-8000-000000000001',
 '40b2c3d4-0007-4000-8000-000000000007', 'STT-07', 'ONLINE_BOOKED',
 'Khô da, ngứa nhiều vùng nếp gấp khủy tay và khoeo chân, gia đình có mẹ bị hen suyễn.',
 'Nữ 23 tuổi, cơ địa dị ứng, biểu hiện viêm da thể tạng đợt bùng phát nhẹ.',
 NULL, 'CONFIRMED', FALSE, 0, NULL, '2026-09-20 19:15:00');

-- Nhật ký luồng xử lý trạng thái ca khám (Status Logs)
INSERT INTO appointment_status_logs (id, appointment_id, from_status, to_status, reason, changed_by) VALUES
('60b2c3d4-0001-4000-8000-000000000001', '50b2c3d4-0001-4000-8000-000000000001', 'CONFIRMED', 'CHECKED_IN', 'Quét mã QR vé hẹn tại quầy tiếp đón', 'e1b2c3d4-0004-4000-8000-000000000004'),
('60b2c3d4-0002-4000-8000-000000000001', '50b2c3d4-0001-4000-8000-000000000001', 'CHECKED_IN', 'IN_PROGRESS', 'Bác sĩ gọi số STT-01 vào phòng khám', 'e1b2c3d4-0002-4000-8000-000000000002'),
('60b2c3d4-0003-4000-8000-000000000001', '50b2c3d4-0001-4000-8000-000000000001', 'IN_PROGRESS', 'COMPLETED', 'Bác sĩ kết luận chẩn đoán và hoàn tất kê đơn', 'e1b2c3d4-0002-4000-8000-000000000002'),
('60b2c3d4-0004-4000-8000-000000000002', '50b2c3d4-0002-4000-8000-000000000002', 'CONFIRMED', 'CHECKED_IN', 'Quét mã QR vé hẹn tại quầy tiếp đón', 'e1b2c3d4-0004-4000-8000-000000000004'),
('60b2c3d4-0005-4000-8000-000000000002', '50b2c3d4-0002-4000-8000-000000000002', 'CHECKED_IN', 'IN_PROGRESS', 'Bác sĩ gọi số STT-02 vào phòng khám', 'e1b2c3d4-0002-4000-8000-000000000002'),
('60b2c3d4-0006-4000-8000-000000000002', '50b2c3d4-0002-4000-8000-000000000002', 'IN_PROGRESS', 'COMPLETED', 'Bác sĩ kết luận chẩn đoán và hoàn tất kê đơn', 'e1b2c3d4-0002-4000-8000-000000000002'),
('60b2c3d4-0007-4000-8000-000000000003', '50b2c3d4-0003-4000-8000-000000000003', 'CONFIRMED', 'CHECKED_IN', 'Bệnh nhân quét mã QR tại quầy tiếp đón', 'e1b2c3d4-0004-4000-8000-000000000004'),
('60b2c3d4-0008-4000-8000-000000000003', '50b2c3d4-0003-4000-8000-000000000003', 'CHECKED_IN', 'IN_PROGRESS', 'Bác sĩ gọi số STT-03 vào phòng khám', 'e1b2c3d4-0002-4000-8000-000000000002'),
('60b2c3d4-0009-4000-8000-000000000004', '50b2c3d4-0004-4000-8000-000000000004', 'CONFIRMED', 'CHECKED_IN', 'Lễ tân tiếp đón và xác nhận hồ sơ tại quầy', 'e1b2c3d4-0004-4000-8000-000000000004'),
('60b2c3d4-0010-4000-8000-000000000005', '50b2c3d4-0005-4000-8000-000000000005', 'CONFIRMED', 'CHECKED_IN', 'Bệnh nhân quét mã QR tại quầy tiếp đón', 'e1b2c3d4-0004-4000-8000-000000000004');

-- Kết luận khám và bệnh án y khoa (Medical Records)
INSERT INTO medical_records (id, appointment_id, diagnosis, doctor_notes) VALUES
('70b2c3d4-0001-4000-8000-000000000001', '50b2c3d4-0001-4000-8000-000000000001',
 'Viêm da tiếp xúc dị ứng cấp do hóa chất tẩy rửa (ICD-10: L23.5)',
 'Tránh tiếp xúc trực tiếp hóa chất tẩy rửa, đeo găng tay cao su khi làm việc nhà. Tái khám sau 7 ngày nếu không thuyên giảm.'),
('70b2c3d4-0002-4000-8000-000000000002', '50b2c3d4-0002-4000-8000-000000000002',
 'Mề đay cấp tính do dị ứng thực phẩm (ICD-10: L50.0)',
 'Kiêng hoàn toàn hải sản trong 2 tuần. Uống đủ 2 lít nước mỗi ngày. Tái khám ngay nếu có dấu hiệu khó thở hoặc sưng nề vùng mắt/môi.');

-- Danh mục thuốc của chi nhánh Q1
INSERT INTO medicines (id, medical_center_id, code, name, active_ingredient, unit) VALUES
('80b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_CETIRIZIN', 'Cetirizine 10mg', 'Cetirizine hydrochloride', 'VIÊN'),
('80b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_HYDROCOR', 'Hydrocortisone cream 1%', 'Hydrocortisone acetate', 'TUÝP'),
('80b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_FEXOFEN', 'Fexofenadine 180mg (Telfast)', 'Fexofenadine hydrochloride', 'VIÊN'),
('80b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_DESLORAT', 'Desloratadine 5mg', 'Desloratadine', 'VIÊN'),
('80b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_VITC', 'Vitamin C 500mg', 'Acid ascorbic', 'VIÊN');

-- Đơn thuốc điện tử (Prescriptions - CLAB-107)
INSERT INTO prescriptions (id, appointment_id, medical_record_id, doctor_id, doctor_name, total_medicine_amount, status) VALUES
('95b2c3d4-0001-4000-8000-000000000001', '50b2c3d4-0001-4000-8000-000000000001', '70b2c3d4-0001-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', 'BS.CKII Nguyễn Minh Anh', 85000.00, 'ACTIVE'),
('95b2c3d4-0002-4000-8000-000000000002', '50b2c3d4-0002-4000-8000-000000000002', '70b2c3d4-0002-4000-8000-000000000002', '10b2c3d4-0001-4000-8000-000000000001', 'BS.CKII Nguyễn Minh Anh', 115000.00, 'ACTIVE');

-- Chi tiết từng loại thuốc trong đơn (Prescription Items)
INSERT INTO prescription_items (id, prescription_id, medical_record_id, medicine_id, medicine_name, unit, dosage, frequency, duration_days, quantity, unit_price, instruction) VALUES
('90b2c3d4-0001-4000-8000-000000000001', '95b2c3d4-0001-4000-8000-000000000001', '70b2c3d4-0001-4000-8000-000000000001',
 '80b2c3d4-0001-4000-8000-000000000001', 'Cetirizine 10mg', 'VIÊN', '10mg', '1 lần/ngày, uống buổi tối sau ăn', 7, 7.00, 5000.00, 'Uống sau ăn tối, có thể gây buồn ngủ nhẹ'),
('90b2c3d4-0002-4000-8000-000000000002', '95b2c3d4-0001-4000-8000-000000000001', '70b2c3d4-0001-4000-8000-000000000001',
 '80b2c3d4-0002-4000-8000-000000000002', 'Hydrocortisone cream 1%', 'TUÝP', 'Thoa lớp mỏng', '2 lần/ngày (sáng, tối)', 7, 1.00, 50000.00, 'Thoa nhẹ nhàng sau khi rửa sạch và lau khô vùng da tổn thương'),
('90b2c3d4-0003-4000-8000-000000000003', '95b2c3d4-0002-4000-8000-000000000002', '70b2c3d4-0002-4000-8000-000000000002',
 '80b2c3d4-0003-4000-8000-000000000003', 'Fexofenadine 180mg (Telfast)', 'VIÊN', '180mg', '1 lần/ngày, uống buổi sáng sau ăn', 7, 7.00, 12000.00, 'Uống nguyên viên với nhiều nước'),
('90b2c3d4-0004-4000-8000-000000000002', '95b2c3d4-0002-4000-8000-000000000002', '70b2c3d4-0002-4000-8000-000000000002',
 '80b2c3d4-0005-4000-8000-000000000005', 'Vitamin C 500mg', 'VIÊN', '500mg', '2 lần/ngày (sáng, trưa)', 7, 14.00, 2200.00, 'Uống sau ăn để tăng sức bền thành mạch');

-- Lịch sử thanh toán viện phí (Payments)
INSERT INTO payments (id, appointment_id, amount, method, status, transaction_ref, paid_at, collected_by, note) VALUES
('a0b2c3d4-0001-4000-8000-000000000001', '50b2c3d4-0001-4000-8000-000000000001', 100000.00, 'VNPAY', 'SUCCEEDED', 'VNPAY_26092019324501', '2026-09-20 19:32:45', NULL, 'Đặt cọc giữ chỗ trực tuyến'),
('a0b2c3d4-0002-4000-8000-000000000002', '50b2c3d4-0001-4000-8000-000000000001', 200000.00, 'CASH', 'SUCCEEDED', NULL, '2026-09-21 07:56:10', 'e1b2c3d4-0004-4000-8000-000000000004', 'Thu phí khám còn lại tại quầy tiếp đón'),
('a0b2c3d4-0003-4000-8000-000000000003', '50b2c3d4-0002-4000-8000-000000000002', 300000.00, 'VNPAY', 'SUCCEEDED', 'VNPAY_26092021021502', '2026-09-20 21:02:15', NULL, 'Thanh toán 100% tiền khám trực tuyến qua VNPay'),
('a0b2c3d4-0004-4000-8000-000000000004', '50b2c3d4-0003-4000-8000-000000000003', 100000.00, 'VNPAY', 'SUCCEEDED', 'VNPAY_26092022163003', '2026-09-20 22:16:30', NULL, 'Đặt cọc giữ chỗ trực tuyến'),
('a0b2c3d4-0005-4000-8000-000000000005', '50b2c3d4-0004-4000-8000-000000000004', 300000.00, 'CASH', 'SUCCEEDED', NULL, '2026-09-21 09:21:00', 'e1b2c3d4-0004-4000-8000-000000000004', 'Thanh toán trọn gói phí khám tại quầy tiếp đón'),
('a0b2c3d4-0006-4000-8000-000000000006', '50b2c3d4-0005-4000-8000-000000000005', 100000.00, 'VNPAY', 'SUCCEEDED', 'VNPAY_26092107471205', '2026-09-21 07:47:12', NULL, 'Đặt cọc giữ chỗ trực tuyến');

-- Đánh giá chất lượng bác sĩ sau khi hoàn tất khám (Doctor Reviews & Spring AI Sentiment)
INSERT INTO doctor_reviews (id, appointment_id, patient_profile_id, doctor_id, rating, comment, ai_sentiment, is_anonymous) VALUES
('f0b2c3d4-0001-4000-8000-000000000001', '50b2c3d4-0001-4000-8000-000000000001',
 '20b2c3d4-0003-4000-8000-000000000003', '10b2c3d4-0001-4000-8000-000000000001',
 5, 'Bác sĩ Minh Anh giải thích rất cặn kẽ và ân cần. Quầy tiếp đón quét mã QR vào thẳng phòng khám, không phải chờ đợi lâu.', 'POSITIVE', FALSE),
('f0b2c3d4-0002-4000-8000-000000000002', '50b2c3d4-0002-4000-8000-000000000002',
 '20b2c3d4-0004-4000-8000-000000000004', '10b2c3d4-0001-4000-8000-000000000001',
 5, 'Uống thuốc theo đơn của bác sĩ chỉ sau 1 tiếng là các nốt mẩn đỏ lặn hẳn. Rất hài lòng về chất lượng dịch vụ!', 'POSITIVE', FALSE);

