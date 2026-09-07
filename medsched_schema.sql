-- ====================================================================
-- CƠ SỞ DỮ LIỆU DỰ ÁN MEDSCHED - QUẢN LÝ LỊCH KHÁM BỆNH THÔNG MINH
-- Hệ quản trị: PostgreSQL 16
-- Tích hợp: Spring Boot 3, Spring AI, YOLO11
-- ====================================================================

-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG & XÁC THỰC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(32) NOT NULL CHECK (role IN ('ROLE_PATIENT', 'ROLE_DOCTOR', 'ROLE_STAFF', 'ROLE_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. BẢNG HỒ SƠ BỆNH NHÂN
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cccd_number VARCHAR(20) UNIQUE,
    health_insurance_no VARCHAR(30),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    address VARCHAR(500),
    medical_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. BẢNG CHUYÊN KHOA Y TẾ
CREATE TABLE specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500)
);

-- 4. BẢNG HỒ SƠ BÁC SĨ
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
    academic_title VARCHAR(100), -- ThS, BS.CKI, PGS.TS...
    experience_years INT NOT NULL DEFAULT 1,
    consultation_fee NUMERIC(19, 2) NOT NULL DEFAULT 200000.00,
    room_number VARCHAR(50),
    bio TEXT,
    avatar_url VARCHAR(500)
);

-- 5. BẢNG LỊCH ĐĂNG KÝ LÀM VIỆC CỦA BÁC SĨ
CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. BẢNG KHUNG GIỜ KHÁM (TIME SLOTS) - CHỐNG TRÙNG LỊCH
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES doctor_schedules(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'LOCKED', 'BLOCKED')),
    version INT NOT NULL DEFAULT 0, -- Khóa lạc quan (Optimistic Locking)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_slots_doctor_date ON time_slots(doctor_id, start_time);

-- 7. BẢNG CA HẸN ĐẶT LỊCH KHÁM
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(16) NOT NULL UNIQUE, -- Mã vé đặt chỗ ngắn (dùng sinh QR Code)
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    slot_id UUID NOT NULL UNIQUE REFERENCES time_slots(id) ON DELETE RESTRICT,
    patient_symptoms TEXT, -- Triệu chứng do người bệnh mô tả
    ai_summary TEXT, -- Tóm tắt 2 dòng do Spring AI tự động trích xuất
    checkin_method VARCHAR(30) CHECK (checkin_method IN ('QR_CODE', 'YOLO_CARD_SCAN', 'MANUAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    check_in_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);

-- 8. BẢNG LƯU KẾT QUẢ PHÂN TÍCH HÌNH ẢNH CỦA YOLO11
CREATE TABLE symptom_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    original_image_url VARCHAR(500) NOT NULL,
    annotated_image_url VARCHAR(500), -- Ảnh đã được YOLO11 vẽ bounding box khoanh vùng
    detected_class VARCHAR(100), -- Tên tổn thương nhận diện (vd: eczema, urticaria, rash)
    confidence_score NUMERIC(5, 4), -- Độ tin cậy (vd: 0.9250)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. BẢNG HỒ SƠ Y KHOA & KẾT QUẢ KHÁM BỆNH
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL, -- Chẩn đoán bệnh của bác sĩ
    doctor_notes TEXT, -- Lời dặn dò, chế độ chăm sóc
    prescription TEXT, -- Toa thuốc / thuốc chỉ định
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA CHO MEDSCHED)
-- ====================================================================

-- 1. Chuyên khoa
INSERT INTO specialties (name, code, description) VALUES
('Chuyên khoa Da liễu', 'DERMATOLOGY', 'Chẩn đoán và điều trị các bệnh lý ngoài da, dị ứng, viêm da cơ địa'),
('Chuyên khoa Nội tổng quát', 'INTERNAL_MEDICINE', 'Khám chữa các bệnh lý nội khoa người lớn, tim mạch, tiêu hóa'),
('Chuyên khoa Răng Hàm Mặt', 'ODONTO_STOMATOLOGY', 'Chăm sóc, điều trị và phục hình răng miệng thẩm mỹ'),
('Chuyên khoa Mắt', 'OPHTHALMOLOGY', 'Khám khúc xạ và điều trị các bệnh lý về mắt');

-- 2. Tài khoản & Bác sĩ mẫu
INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES
('11111111-1111-1111-1111-111111111111', 'dr.minhanh@medsched.vn', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'BS.CKII Nguyễn Minh Anh', '0901234567', 'ROLE_DOCTOR'),
('22222222-2222-2222-2222-222222222222', 'benhnhan.demo@gmail.com', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'Trần Văn Hoàng', '0912345678', 'ROLE_PATIENT');

INSERT INTO doctors (id, user_id, specialty_id, academic_title, experience_years, consultation_fee, room_number, bio) VALUES
('33333333-3333-3333-3333-333333333333', 
 '11111111-1111-1111-1111-111111111111', 
 (SELECT id FROM specialties WHERE code = 'DERMATOLOGY'), 
 'BS.CKII', 15, 300000.00, 'P.205', 'Chuyên gia đầu ngành Da liễu, có hơn 15 năm kinh nghiệm điều trị dị ứng và viêm da.');

INSERT INTO patients (id, user_id, cccd_number, health_insurance_no, date_of_birth, gender, address, medical_history) VALUES
('44444444-4444-4444-4444-444444444444',
 '22222222-2222-2222-2222-222222222222',
 '079201008899', 'DN4790123456789', '2001-05-12', 'MALE', 'Quận 1, TP. Hồ Chí Minh', 'Tiền sử dị ứng phấn hoa nhẹ.');
