-- TECHNICAL NOTE (CLAB-102): key columns must be VARCHAR(36), never CHAR(36).
-- The JPA entities declare @Column(length = 36), which Hibernate maps to
-- varchar(36). If this script creates CHAR(36) columns, Hibernate tries to ALTER
-- them and MySQL refuses because they are referenced by foreign keys, so the
-- application FAILS TO START.
-- ====================================================================
-- CƠ SỞ DỮ LIỆU DỰ ÁN MEDSCHED - MYSQL / MARIADB (XAMPP)
-- Hệ quản trị CHÍNH THỨC của đồ án: MySQL/MariaDB đi kèm XAMPP (phpMyAdmin).
--
-- PHIÊN BẢN 3.2 - 23 BẢNG (ĐỒNG BỘ MEDSCHED V1.5.0)
--   Bản 3.0 sửa 3 lỗi thiết kế được phản biện:
--     [1] users KHÔNG còn medical_center_id / role -> tài khoản là danh tính
--         TOÀN CỤC, 1 bệnh nhân dùng 1 account đi khám ở mọi chi nhánh; quyền
--         nhân sự tách sang bảng nối user_medical_center_roles theo chi nhánh.
--     [2] Thêm bảng payments đúng nghĩa (nhiều lần thu, hoàn tiền, mã giao dịch).
--     [3] Thêm medicines + prescription_items thay cột prescription TEXT.
--   Bản 3.1 thêm bảng services (bảng giá dịch vụ khám của từng chuyên khoa).
--   Bản 3.2 tích hợp:
--     [4] promotions (Quản lý mã ưu đãi, voucher giảm giá và tài trợ viện phí).
--     [5] dev_mode_sessions (Quản lý phiên kiểm thử tự động 24/7 và cấp phát ca khám).
--     [6] Cập nhật liên kết thanh toán VietQR động theo khuyến mãi viện phí.
--
-- CÁCH NẠP: XAMPP Control Panel -> Start MySQL -> http://localhost/phpmyadmin
--           -> tab Import -> chọn file này -> Go. File tự tạo database medsched_db.
--
-- Yêu cầu tối thiểu: MariaDB 10.4+ (bản trong XAMPP 8.x) hoặc MySQL 8.0.16+
-- để ràng buộc CHECK được thực thi thật.
-- ====================================================================

CREATE DATABASE IF NOT EXISTS medsched_db CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE medsched_db;

SET NAMES utf8mb4;

SET CHARACTER SET utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS dev_mode_sessions;

DROP TABLE IF EXISTS promotions;

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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT uq_center_setting UNIQUE (
        medical_center_id,
        setting_key
    ),
    CONSTRAINT fk_settings_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. TÀI KHOẢN NGƯỜI DÙNG - DANH TÍNH TOÀN CỤC, KHÔNG THUỘC CHI NHÁNH NÀO
-- Không có cột role: mọi tài khoản đều mặc định đặt lịch khám được ở mọi chi
-- nhánh (vai trò bệnh nhân). Quyền nhân sự nằm ở user_medical_center_roles.
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    current_session_id VARCHAR(64),
    token_invalid_before DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3b. TOKEN ĐẶT LẠI MẬT KHẨU (FORGOT / RESET PASSWORD - SINGLE USE, 15 PHÚT)
CREATE TABLE password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prt_hash (token_hash),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3c. DANH SÁCH TOKEN BỊ THU HỒI KHI ĐĂNG XUẤT (SERVER-SIDE LOGOUT INVALIDATION)
CREATE TABLE revoked_tokens (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_type VARCHAR(16) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_revoked_hash (token_hash),
    INDEX idx_revoked_expiry (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 4. PHÂN QUYỀN NHÂN SỰ THEO TỪNG CHI NHÁNH (BẢNG NỐI N-N)
-- 1 bác sĩ có thể trực ở nhiều chi nhánh -> nhiều dòng. ROLE_PATIENT cố ý
-- KHÔNG có trong danh sách vì đó là quyền mặc định của mọi tài khoản.
CREATE TABLE user_medical_center_roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    medical_center_id VARCHAR(36) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (
        role IN (
            'ROLE_DOCTOR',
            'ROLE_STAFF',
            'ROLE_ADMIN'
        )
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT uq_user_center_role UNIQUE (
        user_id,
        medical_center_id,
        role
    ),
    CONSTRAINT fk_ucr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ucr_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_ucr_user ON user_medical_center_roles (user_id);

CREATE INDEX idx_ucr_center_role ON user_medical_center_roles (medical_center_id, role);

-- 5. HỒ SƠ NGƯỜI KHÁM (TOÀN CỤC THEO TÀI KHOẢN, DÙNG Ở MỌI CHI NHÁNH)
CREATE TABLE patient_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    relationship VARCHAR(30) NOT NULL DEFAULT 'SELF' CHECK (
        relationship IN (
            'SELF',
            'PARENT',
            'CHILD',
            'SPOUSE',
            'OTHER'
        )
    ),
    full_name VARCHAR(255) NOT NULL,
    cccd_number VARCHAR(20),
    health_insurance_no VARCHAR(30),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (
        gender IN ('MALE', 'FEMALE', 'OTHER')
    ),
    phone VARCHAR(20),
    address VARCHAR(500),
    medical_history TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_patient_profiles_user ON patient_profiles (user_id);

CREATE INDEX idx_patient_profiles_cccd ON patient_profiles (cccd_number);

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
    CONSTRAINT fk_specialties_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT chk_service_duration CHECK (
        estimated_duration_minutes > 0
    ),
    CONSTRAINT fk_services_specialty FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_doctors_specialty FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_doctors_user ON doctors (user_id);

-- 9. LỊCH ĐĂNG KÝ LÀM VIỆC CỦA BÁC SĨ
CREATE TABLE doctor_schedules (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id VARCHAR(36) NOT NULL,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN (
            'ACTIVE',
            'CANCELLED_EMERGENCY',
            'COMPLETED'
        )
    ),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    dev_session_id VARCHAR(36),
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_doctor_schedules_dev_session ON doctor_schedules (dev_session_id);
CREATE INDEX idx_doctor_schedules_test_data ON doctor_schedules (is_test_data);

-- 10. KHUNG GIỜ KHÁM - CHỐNG TRÙNG LỊCH BẰNG OPTIMISTIC LOCKING
CREATE TABLE time_slots (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    schedule_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (
        status IN (
            'AVAILABLE',
            'BOOKED',
            'LOCKED',
            'BLOCKED'
        )
    ),
    version INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_slots_schedule FOREIGN KEY (schedule_id) REFERENCES doctor_schedules (id) ON DELETE CASCADE,
    CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_time_slots_doctor_date ON time_slots (doctor_id, start_time);

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
    queue_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE_BOOKED' CHECK (
        queue_type IN (
            'ONLINE_BOOKED',
            'WALKIN',
            'POST_LAB_RESULT'
        )
    ),
    patient_symptoms TEXT,
    ai_summary TEXT,
    checkin_method VARCHAR(30) CHECK (
        checkin_method IN (
            'QR_CODE',
            'CCCD_QR',
            'MANUAL'
        )
    ),
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (
        status IN (
            'PENDING',
            'CONFIRMED',
            'CHECKED_IN',
            'IN_PROGRESS',
            'WAITING_FOR_LAB_RESULTS',
            'COMPLETED',
            'CANCELLED',
            'MISSED_NO_SHOW'
        )
    ),
    is_delayed BOOLEAN NOT NULL DEFAULT FALSE,
    delay_minutes INT NOT NULL DEFAULT 0,
    check_in_time DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    dev_session_id VARCHAR(36),
    is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_appt_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers (id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_slot FOREIGN KEY (slot_id) REFERENCES time_slots (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_appointments_patient ON appointments (patient_profile_id);

CREATE INDEX idx_appointments_doctor ON appointments (doctor_id);

CREATE INDEX idx_appointments_status ON appointments (status);

CREATE INDEX idx_appointments_queue ON appointments (doctor_id, queue_type, status);

CREATE INDEX idx_appointments_center_date ON appointments (medical_center_id, created_at);

CREATE INDEX idx_appointments_dev_session ON appointments (dev_session_id);
CREATE INDEX idx_appointments_test_data ON appointments (is_test_data);

-- 12. NHẬT KÝ THAY ĐỔI TRẠNG THÁI CA KHÁM
CREATE TABLE appointment_status_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    reason TEXT,
    changed_by VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_user FOREIGN KEY (changed_by) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_status_logs_appointment ON appointment_status_logs (appointment_id);

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
    CONSTRAINT fk_records_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT fk_medicines_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT fk_prescriptions_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
    CONSTRAINT chk_item_duration CHECK (
        duration_days IS NULL
        OR duration_days > 0
    ),
    CONSTRAINT fk_items_record FOREIGN KEY (medical_record_id) REFERENCES medical_records (id) ON DELETE CASCADE,
    CONSTRAINT fk_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_prescription_items_record ON prescription_items (medical_record_id);

CREATE INDEX idx_prescription_items_rx ON prescription_items (prescription_id);

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
    CONSTRAINT fk_invoices_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 18. THANH TOÁN (THAY CHO 2 CỘT payment_status / payment_amount)
-- 1 ca hẹn có thể có NHIỀU dòng: đặt cọc online + thu thêm tại quầy, hoặc
-- lần trả thất bại rồi trả lại. transaction_ref UNIQUE là chốt chống webhook
-- cổng thanh toán gọi lặp làm ghi nhận/hoàn tiền 2 lần (kịch bản 7.8).
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id VARCHAR(36) NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    method VARCHAR(30) NOT NULL CHECK (
        method IN (
            'CASH',
            'CARD',
            'VNPAY',
            'MOMO',
            'BANK_TRANSFER'
        )
    ),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN (
            'PENDING',
            'SUCCEEDED',
            'FAILED',
            'REFUNDED'
        )
    ),
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
    CONSTRAINT chk_payment_amount CHECK (amount >= 0),
    CONSTRAINT chk_payment_refund CHECK (
        refunded_amount >= 0
        AND refunded_amount <= amount
    ),
    CONSTRAINT fk_payments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_collector FOREIGN KEY (collected_by) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_payments_appointment ON payments (appointment_id);

CREATE INDEX idx_payments_status ON payments (status);

-- 17. ĐÁNH GIÁ BÁC SĨ (VERIFIED REVIEW & SPRING AI SENTIMENT)
CREATE TABLE doctor_reviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    patient_profile_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    ai_sentiment VARCHAR(20) CHECK (
        ai_sentiment IN (
            'POSITIVE',
            'NEUTRAL',
            'NEGATIVE'
        )
    ),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_reviews_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_doctor FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_doctor_reviews_doctor ON doctor_reviews (doctor_id);

-- 19. DANH MỤC MÃ KHUYẾN MÃI & VOUCHER ƯU ĐÃI (PROMOTIONS / VOUCHERS)
CREATE TABLE promotions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(30) NOT NULL CHECK (
        discount_type IN ('FREE_DEPOSIT', 'FIX_TO_2K', 'PERCENT', 'FIXED')
    ),
    discount_value DECIMAL(19, 2) NOT NULL,
    max_uses INT DEFAULT 9999,
    used_count INT NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_audience VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_promotions_code ON promotions (code);
CREATE INDEX idx_promotions_active ON promotions (is_active, start_date, end_date);

-- 20. PHIÊN BẬT CHẾ ĐỘ DEVELOP 24/7 (TEST LÀM VIỆC NGOÀI GIỜ & BƠM DỮ LIỆU THỬ NGHIỆM)
CREATE TABLE dev_mode_sessions (
    id VARCHAR(36) PRIMARY KEY,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    activated_by VARCHAR(100),
    notes TEXT,
    cleaned_schedules_count INT NOT NULL DEFAULT 0,
    cleaned_appointments_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_dev_mode_sessions_active ON dev_mode_sessions (is_active);


-- ====================================================================
-- DỮ LIỆU BAN ĐẦU TINH GỌN (CLEAN SEED DATA CHO RENDER / PRODUCTION)
-- Chuẩn hóa: 2 Chi Nhánh, 4 Chuyên Khoa, 4 Bác Sĩ, 1 Lễ Tân, 1 Admin, 0 Bệnh Nhân, 5 Mã Ưu Đãi
-- Mật khẩu chung của tất cả tài khoản hệ thống: Medsched@123
-- Hash BCrypt: $2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti
-- ====================================================================

-- 1. HAI CHI NHÁNH (MEDICAL CENTERS)
INSERT INTO medical_centers (id, code, name, address, phone)
VALUES 
    (
        'a1b2c3d4-0001-4000-8000-000000000001',
        'MED_CN1',
        'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
        'TOTALE COFFEE TEA, 96 Đ. Trần Đại Nghĩa, Tân Tạo, Bình Tân, TP. Hồ Chí Minh',
        '02839123456'
    ),
    (
        'a1b2c3d4-0002-4000-8000-000000000002',
        'MED_CN2',
        'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
        'Cao Đẳng Công Nghệ Thông Tin TP.HCM, 12 Đ. Trịnh Đình Thảo, Tân Phú, TP. Hồ Chí Minh',
        '02839998877'
    );

-- 2. CẤU HÌNH HỆ THỐNG CƠ BẢN CHO 2 CHI NHÁNH
INSERT INTO system_settings (id, medical_center_id, setting_key, setting_value, description)
VALUES 
    ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'DEFAULT_SLOT_DURATION_MINUTES', '30', 'Thời lượng khám mặc định cho mỗi ca'),
    ('b1b2c3d4-0002-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'BUFFER_TIME_MINUTES', '5', 'Thời gian chuẩn bị giữa 2 ca khám'),
    ('b1b2c3d4-0003-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'CANCELLATION_LIMIT_HOURS', '2', 'Cho phép hủy lịch hẹn trước tối thiểu 2 giờ'),
    ('b1b2c3d4-0004-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'MAX_NO_SHOW_PENALTY', '3', 'Số lần bỏ hẹn tối đa trước khi bị hạn chế'),
    ('b1b2c3d4-0001-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'DEFAULT_SLOT_DURATION_MINUTES', '30', 'Thời lượng khám mặc định cho mỗi ca'),
    ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'BUFFER_TIME_MINUTES', '5', 'Thời gian chuẩn bị giữa 2 ca khám'),
    ('b1b2c3d4-0003-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'CANCELLATION_LIMIT_HOURS', '2', 'Cho phép hủy lịch hẹn trước tối thiểu 2 giờ'),
    ('b1b2c3d4-0004-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'MAX_NO_SHOW_PENALTY', '3', 'Số lần bỏ hẹn tối đa trước khi bị hạn chế');

-- 3. BỐN CHUYÊN KHOA (SPECIALTIES)
-- Chi nhánh 1: Da liễu & Nội tổng quát
-- Chi nhánh 2: Răng Hàm Mặt & Mắt
INSERT INTO specialties (id, medical_center_id, name, code, description)
VALUES 
    (
        'c1b2c3d4-0001-4000-8000-000000000001',
        'a1b2c3d4-0001-4000-8000-000000000001',
        'Chuyên khoa Da liễu',
        'DERMATOLOGY',
        'Chẩn đoán, điều trị mẩn ngứa, dị ứng và chăm sóc phục hồi da chuyên sâu'
    ),
    (
        'c1b2c3d4-0002-4000-8000-000000000002',
        'a1b2c3d4-0001-4000-8000-000000000001',
        'Chuyên khoa Nội tổng quát',
        'INTERNAL_MEDICINE',
        'Khám nội khoa tổng quát, tim mạch, huyết áp, hô hấp và rối loạn chuyển hóa'
    ),
    (
        'c1b2c3d4-0003-4000-8000-000000000003',
        'a1b2c3d4-0002-4000-8000-000000000002',
        'Chuyên khoa Răng Hàm Mặt',
        'ODONTO_STOMATOLOGY',
        'Khám chữa bệnh răng miệng, nhổ răng, lấy cao răng và phục hình thẩm mỹ'
    ),
    (
        'c1b2c3d4-0004-4000-8000-000000000004',
        'a1b2c3d4-0002-4000-8000-000000000002',
        'Chuyên khoa Mắt',
        'OPHTHALMOLOGY',
        'Đo thị lực khúc xạ, soi đáy mắt và điều trị các bệnh lý nhãn khoa'
    );

-- 4. BẢNG GIÁ DỊCH VỤ KHÁM CỦA 4 CHUYÊN KHOA (SERVICES)
INSERT INTO services (id, specialty_id, name, code, description, price, estimated_duration_minutes)
VALUES 
    ('d1b2c3d4-0001-4000-8000-000000000001', 'c1b2c3d4-0001-4000-8000-000000000001', 'Khám Da liễu cơ bản', 'DERM_BASIC', 'Khám và tư vấn các bệnh da liễu thông thường', 300000.00, 30),
    ('d1b2c3d4-0002-4000-8000-000000000001', 'c1b2c3d4-0001-4000-8000-000000000001', 'Điều trị Laser chăm sóc da', 'DERM_LASER', 'Chăm sóc và điều trị nám da bằng công nghệ cao', 1200000.00, 45),
    ('d1b2c3d4-0001-4000-8000-000000000002', 'c1b2c3d4-0002-4000-8000-000000000002', 'Khám Nội tổng quát', 'INT_BASIC', 'Khám nội khoa tổng quát, đo huyết áp, tư vấn sức khỏe', 250000.00, 30),
    ('d1b2c3d4-0002-4000-8000-000000000002', 'c1b2c3d4-0002-4000-8000-000000000002', 'Khám chuyên sâu Tim mạch & Chuyển hóa', 'INT_CARDIO', 'Đo điện tim, tư vấn rối loạn mỡ máu và tim mạch', 450000.00, 45),
    ('d1b2c3d4-0001-4000-8000-000000000003', 'c1b2c3d4-0003-4000-8000-000000000003', 'Khám & Tư vấn Răng Hàm Mặt', 'DENT_BASIC', 'Khám tổng quát răng miệng và lập kế hoạch điều trị', 150000.00, 30),
    ('d1b2c3d4-0002-4000-8000-000000000003', 'c1b2c3d4-0003-4000-8000-000000000003', 'Lấy cao răng & Đánh bóng siêu âm', 'DENT_CLEAN', 'Vệ sinh cao răng toàn diện bằng máy rung siêu âm', 300000.00, 30),
    ('d1b2c3d4-0001-4000-8000-000000000004', 'c1b2c3d4-0004-4000-8000-000000000004', 'Khám mắt & Đo khúc xạ', 'EYE_BASIC', 'Đo độ cận/loạn/viễn thị và kiểm tra thị lực toàn diện', 200000.00, 30),
    ('d1b2c3d4-0002-4000-8000-000000000004', 'c1b2c3d4-0004-4000-8000-000000000004', 'Soi đáy mắt & Đo nhãn áp', 'EYE_PRESSURE', 'Kiểm tra thần kinh thị giác và tầm soát cườm nước', 350000.00, 30);

-- 5. DANH MỤC THUỐC CƠ BẢN (MEDICINES)
INSERT INTO medicines (id, medical_center_id, code, name, active_ingredient, unit)
VALUES 
    ('80b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_PARACET_1', 'Paracetamol 500mg', 'Paracetamol', 'VIÊN'),
    ('80b2c3d4-0002-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_CETIRIZIN_1', 'Cetirizine 10mg', 'Cetirizine hydrochloride', 'VIÊN'),
    ('80b2c3d4-0003-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_AMOX_1', 'Amoxicillin 500mg', 'Amoxicillin trihydrate', 'VIÊN'),
    ('80b2c3d4-0004-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED_VITC_1', 'Vitamin C 500mg', 'Acid ascorbic', 'VIÊN'),
    ('80b2c3d4-0001-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'MED_PARACET_2', 'Paracetamol 500mg', 'Paracetamol', 'VIÊN'),
    ('80b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'MED_TOBRADEX_2', 'Tobradex Nhỏ Mắt 5ml', 'Tobramycin, Dexamethasone', 'LỌ'),
    ('80b2c3d4-0003-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'MED_CHLORHEX_2', 'Nước súc miệng Chlorhexidine 0.12%', 'Chlorhexidine gluconate', 'CHAI'),
    ('80b2c3d4-0004-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'MED_VITC_2', 'Vitamin C 500mg', 'Acid ascorbic', 'VIÊN');

-- 6. TÀI KHOẢN NGƯỜI DÙNG NHÂN SỰ (USERS)
-- Gồm: 1 Quản trị viên, 4 Bác sĩ, 1 Lễ tân (0 BỆNH NHÂN - HOÀN TOÀN KHÔNG CÓ BỆNH NHÂN)
-- Mật khẩu chung của tất cả tài khoản: Medsched@123
INSERT INTO users (id, email, password_hash, full_name, phone)
VALUES 
    (
        'e1b2c3d4-0001-4000-8000-000000000001',
        'admin@medsched.vn',
        '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti',
        'Quản Trị Viên Hệ Thống',
        '0900000001'
    ),
    (
        'e1b2c3d4-0002-4000-8000-000000000002',
        'dr.minhanh@medsched.vn',
        '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti',
        'BS.CKII Nguyễn Minh Anh',
        '0901234567'
    ),
    (
        'e1b2c3d4-0003-4000-8000-000000000003',
        'dr.tranhung@medsched.vn',
        '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti',
        'PGS.TS Trần Văn Hùng',
        '0902345678'
    ),
    (
        'e1b2c3d4-0004-4000-8000-000000000004',
        'dr.vuminhduc@medsched.vn',
        '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti',
        'ThS.BS Vũ Minh Đức',
        '0906678901'
    ),
    (
        'e1b2c3d4-0005-4000-8000-000000000005',
        'dr.phamquynhchi@medsched.vn',
        '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti',
        'BS.CKII Phạm Quỳnh Chi',
        '0908890123'
    ),
    (
        'e1b2c3d4-0006-4000-8000-000000000006',
        'letan@medsched.vn',
        '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti',
        'Lễ Tân Tiếp Đón',
        '0988776655'
    );

-- 7. PHÂN QUYỀN NHÂN SỰ THEO CHI NHÁNH (USER_MEDICAL_CENTER_ROLES)
INSERT INTO user_medical_center_roles (id, user_id, medical_center_id, role)
VALUES 
    -- Admin có quyền quản trị cả 2 chi nhánh
    ('f1b2c3d4-0001-4000-8000-000000000001', 'e1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'ROLE_ADMIN'),
    ('f1b2c3d4-0001-4000-8000-000000000002', 'e1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0002-4000-8000-000000000002', 'ROLE_ADMIN'),
    -- Lễ tân phụ trách tiếp đón cả 2 chi nhánh
    ('f1b2c3d4-0006-4000-8000-000000000001', 'e1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0001-4000-8000-000000000001', 'ROLE_STAFF'),
    ('f1b2c3d4-0006-4000-8000-000000000002', 'e1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0002-4000-8000-000000000002', 'ROLE_STAFF'),
    -- 4 Bác sĩ phân bổ vào 2 chi nhánh (Mỗi chi nhánh 2 Bác sĩ)
    ('f1b2c3d4-0002-4000-8000-000000000001', 'e1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'ROLE_DOCTOR'),
    ('f1b2c3d4-0003-4000-8000-000000000001', 'e1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'ROLE_DOCTOR'),
    ('f1b2c3d4-0004-4000-8000-000000000002', 'e1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0002-4000-8000-000000000002', 'ROLE_DOCTOR'),
    ('f1b2c3d4-0005-4000-8000-000000000002', 'e1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0002-4000-8000-000000000002', 'ROLE_DOCTOR');

-- 8. HỒ SƠ 4 BÁC SĨ (DOCTORS)
INSERT INTO doctors (id, user_id, specialty_id, academic_title, consultation_fee, room_number, bio)
VALUES 
    (
        '10b2c3d4-0001-4000-8000-000000000001',
        'e1b2c3d4-0002-4000-8000-000000000002',
        'c1b2c3d4-0001-4000-8000-000000000001',
        'BS.CKII',
        300000.00,
        'P.205',
        'Chuyên gia đầu ngành Da liễu với hơn 15 năm kinh nghiệm điều trị và phục hồi da.'
    ),
    (
        '10b2c3d4-0002-4000-8000-000000000002',
        'e1b2c3d4-0003-4000-8000-000000000003',
        'c1b2c3d4-0002-4000-8000-000000000002',
        'PGS.TS',
        350000.00,
        'P.208',
        'Chuyên gia Nội tổng quát, tim mạch học và rối loạn chuyển hóa với hơn 20 năm kinh nghiệm.'
    ),
    (
        '10b2c3d4-0003-4000-8000-000000000003',
        'e1b2c3d4-0004-4000-8000-000000000004',
        'c1b2c3d4-0003-4000-8000-000000000003',
        'ThS.BS',
        250000.00,
        'P.101',
        'Bác sĩ Răng Hàm Mặt, phục hình thẩm mỹ và nha khoa kỹ thuật cao với 10 năm kinh nghiệm.'
    ),
    (
        '10b2c3d4-0004-4000-8000-000000000004',
        'e1b2c3d4-0005-4000-8000-000000000005',
        'c1b2c3d4-0004-4000-8000-000000000004',
        'BS.CKII',
        250000.00,
        'P.102',
        'Chuyên gia Mắt & Khúc xạ giác mạc, điều trị bệnh lý nhãn khoa với 16 năm kinh nghiệm.'
    );

-- 9. DANH MỤC MÃ KHUYẾN MÃI & VOUCHER (PROMOTIONS)
INSERT INTO promotions (id, code, name, description, discount_type, discount_value, max_uses, used_count, start_date, end_date, target_audience, is_active)
VALUES 
    (
        'promo-demo2k',
        'DEMO2K',
        'Mã Thử Nghiệm Thanh Toán Thật (2.000 đ)',
        'Giảm tiền đặt cọc xuống đúng 2.000 đ để quét mã VietQR bằng App ngân hàng thật khi nghiệm thu demo.',
        'FIX_TO_2K',
        2000.00,
        9999,
        0,
        '2026-01-01',
        '2026-12-31',
        'Hội đồng phản biện & Giảng viên chấm thi',
        TRUE
    ),
    (
        'promo-giaovien',
        'GIAOVIEN',
        'Tri Ân Thầy Cô & Giảng Viên Chấm Thi',
        'Miễn phí 100% tiền đặt cọc giữ chỗ (0 đ). Xuất phiếu khám ngay khi xác nhận.',
        'FREE_DEPOSIT',
        100.00,
        9999,
        0,
        '2026-01-01',
        '2026-12-31',
        'Giảng viên & Hội đồng chấm thi',
        TRUE
    ),
    (
        'promo-medfree',
        'MEDFREE',
        'Mã Kiểm Thử Hệ Thống MedSched',
        'Miễn 100% tiền cọc kiểm thử nghiệm thu toàn bộ tính năng luồng đặt lịch khám.',
        'FREE_DEPOSIT',
        100.00,
        9999,
        0,
        '2026-01-01',
        '2026-12-31',
        'Tester & Khách dùng thử',
        TRUE
    ),
    (
        'promo-medvip',
        'MEDVIP',
        'Ưu Đãi Khách Hàng Thân Thiết (VIP)',
        'Giảm 50% tiền đặt cọc giữ chỗ khi đặt khám cùng Bác sĩ Chuyên khoa II / Phó Giáo Sư.',
        'PERCENT',
        50.00,
        200,
        0,
        '2026-03-01',
        '2026-11-30',
        'Bệnh nhân tái khám & Hội viên VIP',
        TRUE
    ),
    (
        'promo-chaoban',
        'CHAOBAN',
        'Chào Đón Bệnh Nhân Mới Đặt Lịch Online',
        'Giảm ngay 30.000 đ tiền đặt cọc dịch vụ khám tổng quát & chuyên khoa.',
        'FIXED',
        30000.00,
        500,
        0,
        '2026-05-01',
        '2026-12-31',
        'Bệnh nhân mới lần đầu đặt khám',
        TRUE
    );

-- GHI CHÚ CHUẨN HÓA SẠCH SẼ (CLEAN SLATE):
-- 0 BỆNH NHÂN.
-- CÁC BẢNG SAU HOÀN TOÀN TRỐNG (0 BẢN GHI):
--   - patient_profiles: 0
--   - doctor_schedules: 0
--   - time_slots: 0
--   - appointments: 0
--   - appointment_status_logs: 0
--   - medical_records: 0
--   - prescriptions: 0
--   - prescription_items: 0
--   - invoices: 0
--   - payments: 0
--   - doctor_reviews: 0
--   - password_reset_tokens: 0
--   - revoked_tokens: 0
