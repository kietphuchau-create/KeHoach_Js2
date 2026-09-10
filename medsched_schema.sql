-- ====================================================================
-- CƠ SỞ DỮ LIỆU DỰ ÁN MEDSCHED - HỆ THỐNG ĐẶT LỊCH & TIẾP ĐÓN BỆNH VIỆN
-- Hệ quản trị: PostgreSQL 16 (Cổng 5433) / PostgreSQL 18
-- Tích hợp: Spring Boot 3, Spring AI (ChatClient, Triage, PGVector), PostgreSQL Full Audit
-- Phiên bản: 2.0 (Cập nhật theo góp ý Giảng viên & Kịch bản thực tế)
-- ====================================================================

-- 1. BẢNG CƠ SỞ Y TẾ / CHI NHÁNH (HỖ TRỢ MỞ RỘNG SAAS / MULTI-TENANT)
CREATE TABLE medical_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 2. BẢNG CẤU HÌNH HỆ THỐNG (SYSTEM SETTINGS - TRÁNH HARDCODE TRONG SCHEDULE)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_center_id UUID REFERENCES medical_centers(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_center_setting UNIQUE (medical_center_id, setting_key)
);

-- 3. BẢNG TÀI KHOẢN NGƯỜI DÙNG & XÁC THỰC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_center_id UUID REFERENCES medical_centers(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(32) NOT NULL CHECK (role IN ('ROLE_PATIENT', 'ROLE_DOCTOR', 'ROLE_STAFF', 'ROLE_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 4. BẢNG HỒ SƠ BỆNH NHÂN (HỖ TRỢ ĐẶT LỊCH HỘ CHO NGƯỜI THÂN / FAMILY PROFILES)
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Tài khoản người đặt
    relationship VARCHAR(30) NOT NULL DEFAULT 'SELF' CHECK (relationship IN ('SELF', 'PARENT', 'CHILD', 'SPOUSE', 'OTHER')),
    full_name VARCHAR(255) NOT NULL,
    cccd_number VARCHAR(20),
    health_insurance_no VARCHAR(30),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    phone VARCHAR(20),
    address VARCHAR(500),
    medical_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX idx_patient_profiles_cccd ON patient_profiles(cccd_number);

-- 5. BẢNG CHUYÊN KHOA Y TẾ
CREATE TABLE specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_center_id UUID REFERENCES medical_centers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_center_specialty UNIQUE (medical_center_id, code)
);

-- 6. BẢNG HỒ SƠ BÁC SĨ
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
    academic_title VARCHAR(100), -- ThS, BS.CKI, PGS.TS...
    experience_years INT NOT NULL DEFAULT 1,
    consultation_fee NUMERIC(19, 2) NOT NULL DEFAULT 200000.00,
    room_number VARCHAR(50),
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 7. BẢNG LỊCH ĐĂNG KÝ LÀM VIỆC CỦA BÁC SĨ (CÓ TRẠNG THÁI KHẨN CẤP / NGHỈ ĐỘT XUẤT)
CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT, -- NULL nếu kế thừa từ system_settings
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED_EMERGENCY', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 8. BẢNG KHUNG GIỜ KHÁM (TIME SLOTS) - CHỐNG TRÙNG LỊCH BẰNG OPTIMISTIC LOCKING
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES doctor_schedules(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'LOCKED', 'BLOCKED')),
    version INT NOT NULL DEFAULT 0, -- Khóa lạc quan (Optimistic Locking) chống Race Condition
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_time_slots_doctor_date ON time_slots(doctor_id, start_time);

-- 9. BẢNG CA HẸN ĐẶT LỊCH KHÁM (HỖ TRỢ ĐIỀU PHỐI HÀNG ĐỢI & THANH TOÁN)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(16) NOT NULL UNIQUE, -- Mã đặt hẹn (sinh QR)
    patient_profile_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    slot_id UUID REFERENCES time_slots(id) ON DELETE RESTRICT, -- Có thể NULL đối với khách vãng lai cấp số chờ
    queue_number VARCHAR(20) NOT NULL, -- Số thứ tự hàng đợi (vd: APP-1000, WLK-001, LAB-01)
    queue_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE_BOOKED' CHECK (queue_type IN ('ONLINE_BOOKED', 'WALKIN', 'POST_LAB_RESULT')),
    patient_symptoms TEXT, -- Triệu chứng bệnh nhân mô tả
    ai_summary TEXT, -- Bản tóm tắt 2 dòng do Spring AI trích xuất
    checkin_method VARCHAR(30) CHECK (checkin_method IN ('QR_CODE', 'CCCD_QR', 'MANUAL')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID_AT_COUNTER', 'DEPOSITED_VNPAY', 'REFUNDED')),
    payment_amount NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN (
        'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 
        'WAITING_FOR_LAB_RESULTS', 'COMPLETED', 'CANCELLED', 'MISSED_NO_SHOW'
    )),
    is_delayed BOOLEAN NOT NULL DEFAULT FALSE, -- Báo ca trước kéo dài
    delay_minutes INT NOT NULL DEFAULT 0,
    check_in_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_appointments_patient ON appointments(patient_profile_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_queue ON appointments(doctor_id, queue_type, status);

-- 10. BẢNG NHẬT KÝ LỊCH SỬ THAY ĐỔI TRẠNG THÁI CA KHÁM (AUDIT STATUS LOGS)
CREATE TABLE appointment_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    reason TEXT, -- Lý do hủy, dời lịch, hoặc bác sĩ đi cấp cứu
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_logs_appointment ON appointment_status_logs(appointment_id);

-- 11. BẢNG HỒ SƠ BỆNH ÁN & KẾT QUẢ KHÁM BỆNH
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL, -- Chẩn đoán bệnh
    doctor_notes TEXT, -- Lời dặn dò, chế độ theo dõi
    prescription TEXT, -- Toa thuốc / thuốc chỉ định
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 12. BẢNG ĐÁNH GIÁ CHẤT LƯỢNG BÁC SĨ (VERIFIED REVIEWS & SPRING AI SENTIMENT)
CREATE TABLE doctor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    patient_profile_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), -- Điểm 1 đến 5 sao
    comment TEXT, -- Nhận xét của bệnh nhân
    ai_sentiment VARCHAR(20) CHECK (ai_sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')), -- Spring AI phân tích cảm xúc
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

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
