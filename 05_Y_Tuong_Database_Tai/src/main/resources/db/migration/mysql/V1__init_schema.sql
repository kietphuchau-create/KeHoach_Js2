-- ====================================================================
-- Flyway V1 - MedSched persistence prototype (MySQL/MariaDB - XAMPP)
-- Tương đương 04_Database_Design/medsched_schema_mysql_xampp.sql (đã kiểm
-- thử thực tế trên MariaDB 10.4.32 đi kèm XAMPP), nhưng bỏ DEFAULT (UUID()),
-- DROP TABLE và CREATE DATABASE/USE vì Flyway migrate trên 1 database có sẵn
-- và id luôn do tầng ứng dụng sinh trước khi insert (khớp String id trong entity).
--
-- PHIÊN BẢN 3.0 - SỬA 3 LỖI THIẾT KẾ ĐƯỢC PHẢN BIỆN:
--   [1] users KHÔNG còn medical_center_id và role. Tài khoản là danh tính
--       TOÀN CỤC: 1 bệnh nhân đăng ký 1 lần, đi khám ở BẤT KỲ chi nhánh nào
--       cũng dùng chung tài khoản + chung hồ sơ bệnh án (trước đây bị khóa
--       vào 1 phòng khám, sang cơ sở khác phải tạo account mới -> mất lịch sử).
--       Quyền nhân sự (bác sĩ/lễ tân/admin) chuyển sang bảng nối
--       user_medical_center_roles, phạm vi theo từng chi nhánh.
--   [2] Thanh toán tách thành bảng payments đúng nghĩa (nhiều lần thu, hoàn
--       tiền, mã giao dịch cổng thanh toán) thay cho 2 cột payment_status /
--       payment_amount nhét trong appointments.
--   [3] Đơn thuốc tách thành medicines (danh mục thuốc) + prescription_items
--       (từng dòng thuốc) thay cho 1 cột prescription TEXT không truy vấn được.
-- ====================================================================

-- 1. CƠ SỞ Y TẾ / CHI NHÁNH (HỖ TRỢ MỞ RỘNG SAAS / MULTI-TENANT)
CREATE TABLE medical_centers (
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PHÂN QUYỀN NHÂN SỰ THEO TỪNG CHI NHÁNH (BẢNG NỐI N-N)
-- 1 bác sĩ có thể trực ở nhiều chi nhánh -> nhiều dòng. ROLE_PATIENT cố ý
-- KHÔNG có trong danh sách vì đó là quyền mặc định của mọi tài khoản.
CREATE TABLE user_medical_center_roles (
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    specialty_id VARCHAR(36) NOT NULL,
    academic_title VARCHAR(100),
    experience_years INT NOT NULL DEFAULT 1,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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

-- 15. TỪNG DÒNG THUỐC TRONG ĐƠN (THAY CHO medical_records.prescription TEXT)
-- medicine_name / unit là BẢN CHỤP (snapshot) tên thuốc lúc kê đơn - bắt buộc
-- về mặt y tế: đơn thuốc cũ phải in lại đúng như đã kê, dù sau này danh mục
-- thuốc bị đổi tên hoặc ngừng dùng. Cùng nguyên tắc với order_items lưu kèm
-- name/unit_price trong repo tham khảo spring-ai-demo (EvShop).
-- medicine_id cho phép NULL: bác sĩ kê thuốc ngoài danh mục chi nhánh.
CREATE TABLE prescription_items (
    id VARCHAR(36) PRIMARY KEY,
    medical_record_id VARCHAR(36) NOT NULL,
    medicine_id VARCHAR(36),
    medicine_name VARCHAR(255) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration_days INT,
    quantity DECIMAL(10, 2) NOT NULL,
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

-- 16. THANH TOÁN (THAY CHO 2 CỘT payment_status / payment_amount)
-- 1 ca hẹn có thể có NHIỀU dòng: đặt cọc online + thu thêm tại quầy, hoặc
-- lần trả thất bại rồi trả lại. transaction_ref UNIQUE là chốt chống webhook
-- cổng thanh toán gọi lặp làm ghi nhận/hoàn tiền 2 lần (kịch bản 7.8).
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
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
    id VARCHAR(36) PRIMARY KEY,
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
