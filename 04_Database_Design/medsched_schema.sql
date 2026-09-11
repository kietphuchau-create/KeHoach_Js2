-- ====================================================================
-- CƠ SỞ DỮ LIỆU DỰ ÁN MEDSCHED - HỆ THỐNG ĐẶT LỊCH & TIẾP ĐÓN BỆNH VIỆN
-- Hệ quản trị: PostgreSQL 16 (Cổng 5433) / PostgreSQL 18
-- Tích hợp: Spring Boot 3, Spring AI (ChatClient, Triage, PGVector), PostgreSQL Full Audit
-- Phiên bản: 3.0 (16 bảng - Sửa 3 lỗi thiết kế được phản biện)
--
-- THAY ĐỔI SO VỚI PHIÊN BẢN 2.0 (12 bảng):
--   [1] users KHÔNG còn medical_center_id và role. Tài khoản trở thành danh
--       tính TOÀN CỤC: 1 bệnh nhân đăng ký 1 lần là đi khám được ở MỌI chi
--       nhánh với cùng 1 hồ sơ bệnh án. Trước đây tài khoản bị khóa vào 1
--       phòng khám -> sang cơ sở khác buộc phải tạo account mới, mất toàn bộ
--       lịch sử khám (lỗi thiết kế nghiêm trọng nhất của bản 2.0).
--       Quyền nhân sự chuyển sang bảng nối user_medical_center_roles (mục 4),
--       phạm vi theo từng chi nhánh: 1 bác sĩ trực 2 nơi = 2 dòng.
--   [2] Thêm bảng payments (mục 15) thay cho 2 cột payment_status /
--       payment_amount nhét trong appointments: ghi được nhiều lần thu tiền
--       cho 1 ca khám (cọc online + thu thêm tại quầy), mã giao dịch cổng
--       thanh toán, lần trả thất bại, và hoàn tiền từng phần.
--   [3] Thêm medicines (mục 13) + prescription_items (mục 14) thay cho cột
--       medical_records.prescription TEXT: đơn thuốc trở thành dữ liệu truy
--       vấn/thống kê được thay vì 1 đoạn văn bản tự do.
--   [4] doctors đổi UNIQUE(user_id) thành UNIQUE(user_id, specialty_id) để 1
--       người hành nghề được ở nhiều chuyên khoa / nhiều chi nhánh.
--   [5] appointments thêm medical_center_id: vì users đã toàn cục, đây là nơi
--       ghi nhận ca khám này diễn ra ở chi nhánh nào.
-- ====================================================================

-- 1. CƠ SỞ Y TẾ / CHI NHÁNH (HỖ TRỢ MỞ RỘNG SAAS / MULTI-TENANT)
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

-- 2. CẤU HÌNH HỆ THỐNG (medical_center_id NULL = cấu hình mặc định toàn hệ thống)
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

-- 3. TÀI KHOẢN NGƯỜI DÙNG - DANH TÍNH TOÀN CỤC, KHÔNG THUỘC CHI NHÁNH NÀO
-- Không có cột role: mọi tài khoản đều mặc định đặt lịch khám được ở mọi chi
-- nhánh (vai trò bệnh nhân). Quyền nhân sự nằm ở user_medical_center_roles.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 4. PHÂN QUYỀN NHÂN SỰ THEO TỪNG CHI NHÁNH (BẢNG NỐI N-N)
-- 1 bác sĩ có thể trực ở nhiều chi nhánh -> nhiều dòng. ROLE_PATIENT cố ý
-- KHÔNG có trong danh sách vì đó là quyền mặc định của mọi tài khoản.
CREATE TABLE user_medical_center_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medical_center_id UUID NOT NULL REFERENCES medical_centers(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('ROLE_DOCTOR', 'ROLE_STAFF', 'ROLE_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_user_center_role UNIQUE (user_id, medical_center_id, role)
);

CREATE INDEX idx_ucr_user ON user_medical_center_roles(user_id);
CREATE INDEX idx_ucr_center_role ON user_medical_center_roles(medical_center_id, role);

-- 5. HỒ SƠ NGƯỜI KHÁM (TOÀN CỤC THEO TÀI KHOẢN, DÙNG Ở MỌI CHI NHÁNH)
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- 6. CHUYÊN KHOA (LUÔN THUỘC 1 CHI NHÁNH)
CREATE TABLE specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_center_id UUID NOT NULL REFERENCES medical_centers(id) ON DELETE CASCADE,
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

-- 7. HỒ SƠ BÁC SĨ
-- UNIQUE(user_id, specialty_id) thay cho UNIQUE(user_id): 1 người có thể hành
-- nghề ở nhiều chuyên khoa / nhiều chi nhánh (specialty đã gắn medical_center).
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
    academic_title VARCHAR(100),
    experience_years INT NOT NULL DEFAULT 1,
    consultation_fee NUMERIC(19, 2) NOT NULL DEFAULT 200000.00,
    room_number VARCHAR(50),
    bio TEXT,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_doctors_user_specialty UNIQUE (user_id, specialty_id)
);

CREATE INDEX idx_doctors_user ON doctors(user_id);

-- 8. LỊCH ĐĂNG KÝ LÀM VIỆC CỦA BÁC SĨ
CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED_EMERGENCY', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 9. KHUNG GIỜ KHÁM - CHỐNG TRÙNG LỊCH BẰNG OPTIMISTIC LOCKING
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES doctor_schedules(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'LOCKED', 'BLOCKED')),
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_time_slots_doctor_date ON time_slots(doctor_id, start_time);

-- 10. CA HẸN KHÁM
-- medical_center_id: ghi rõ ca khám này diễn ra ở CHI NHÁNH NÀO. Vì users đã
-- toàn cục, đây là chỗ duy nhất cho biết bệnh nhân đến khám ở đâu -> 1 tài
-- khoản có thể có ca khám ở nhiều chi nhánh khác nhau.
-- Không còn payment_status / payment_amount: xem bảng payments (mục 15).
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(16) NOT NULL UNIQUE,
    medical_center_id UUID NOT NULL REFERENCES medical_centers(id) ON DELETE RESTRICT,
    patient_profile_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    slot_id UUID REFERENCES time_slots(id) ON DELETE RESTRICT,
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
CREATE INDEX idx_appointments_center_date ON appointments(medical_center_id, created_at);

-- 11. NHẬT KÝ THAY ĐỔI TRẠNG THÁI CA KHÁM
CREATE TABLE appointment_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_logs_appointment ON appointment_status_logs(appointment_id);

-- 12. HỒ SƠ BỆNH ÁN (KẾT LUẬN KHÁM) - đơn thuốc xem prescription_items
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    doctor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 13. DANH MỤC THUỐC CỦA CHI NHÁNH
CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_center_id UUID NOT NULL REFERENCES medical_centers(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),
    unit VARCHAR(30) NOT NULL DEFAULT 'VIÊN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_center_medicine UNIQUE (medical_center_id, code)
);

-- 14. TỪNG DÒNG THUỐC TRONG ĐƠN (THAY CHO medical_records.prescription TEXT)
-- medicine_name / unit là BẢN CHỤP (snapshot) tên thuốc lúc kê đơn - bắt buộc
-- về mặt y tế: đơn thuốc cũ phải in lại đúng như đã kê, dù sau này danh mục
-- thuốc bị đổi tên hoặc ngừng dùng. Cùng nguyên tắc với order_items lưu kèm
-- name/unit_price trong repo tham khảo spring-ai-demo (EvShop).
-- medicine_id cho phép NULL: bác sĩ kê thuốc ngoài danh mục chi nhánh.
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    medicine_name VARCHAR(255) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration_days INT,
    quantity NUMERIC(10, 2) NOT NULL,
    instruction VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT chk_item_quantity CHECK (quantity > 0),
    CONSTRAINT chk_item_duration CHECK (duration_days IS NULL OR duration_days > 0)
);

CREATE INDEX idx_prescription_items_record ON prescription_items(medical_record_id);

-- 15. THANH TOÁN (THAY CHO 2 CỘT payment_status / payment_amount)
-- 1 ca hẹn có thể có NHIỀU dòng: đặt cọc online + thu thêm tại quầy, hoặc
-- lần trả thất bại rồi trả lại. transaction_ref UNIQUE là chốt chống webhook
-- cổng thanh toán gọi lặp làm ghi nhận/hoàn tiền 2 lần (kịch bản 7.8).
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
    amount NUMERIC(19, 2) NOT NULL,
    method VARCHAR(30) NOT NULL CHECK (method IN ('CASH', 'CARD', 'VNPAY', 'MOMO', 'BANK_TRANSFER')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
    transaction_ref VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_amount NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_ref VARCHAR(100),
    collected_by UUID REFERENCES users(id),
    note VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_payment_txn UNIQUE (transaction_ref),
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_refund CHECK (refunded_amount >= 0 AND refunded_amount <= amount)
);

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 16. ĐÁNH GIÁ BÁC SĨ (VERIFIED REVIEW & SPRING AI SENTIMENT)
CREATE TABLE doctor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    patient_profile_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    ai_sentiment VARCHAR(20) CHECK (ai_sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
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

-- [1] Hai chi nhánh
INSERT INTO medical_centers (id, code, name, address, phone) VALUES
('00000000-0000-0000-0000-000000000001', 'MED_Q1', 'Bệnh Viện Đa Khoa MedSched - Chi Nhánh Quận 1', 'Số 123 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1, TP.HCM', '02839123456'),
('00000000-0000-0000-0000-000000000002', 'MED_Q7', 'Bệnh Viện Đa Khoa MedSched - Chi Nhánh Quận 7', 'Số 45 Nguyễn Thị Thập, P. Tân Phú, Q.7, TP.HCM', '02839998877');

INSERT INTO system_settings (id, medical_center_id, setting_key, setting_value, description) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DEFAULT_SLOT_DURATION_MINUTES', '30', 'Thời lượng khám mặc định cho mỗi ca'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'BUFFER_TIME_MINUTES', '5', 'Thời gian chuẩn bị giữa 2 ca khám'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'CANCELLATION_LIMIT_HOURS', '2', 'Cho phép hủy lịch hẹn trước tối thiểu 2 giờ'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'MAX_NO_SHOW_PENALTY', '3', 'Số lần bỏ hẹn tối đa trước khi bị hạn chế đặt online');

INSERT INTO specialties (id, medical_center_id, name, code, description) VALUES
('55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Da liễu', 'DERMATOLOGY', 'Chẩn đoán và điều trị bệnh ngoài da, mẩn ngứa, viêm da dị ứng'),
('55555555-5555-5555-5555-555555555552', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Nội tổng quát', 'INTERNAL_MEDICINE', 'Khám nội khoa người lớn, tim mạch, huyết áp, tiêu hóa'),
('55555555-5555-5555-5555-555555555553', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Răng Hàm Mặt', 'ODONTO_STOMATOLOGY', 'Chăm sóc, điều trị và phục hình răng miệng'),
('55555555-5555-5555-5555-555555555554', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Mắt', 'OPHTHALMOLOGY', 'Khám thị lực và điều trị khúc xạ, bệnh lý mắt'),
-- Chi nhánh Q7 cũng có khoa Da liễu riêng (cùng code, khác chi nhánh -> hợp lệ
-- nhờ UNIQUE(medical_center_id, code))
('55555555-5555-5555-5555-555555555557', '00000000-0000-0000-0000-000000000002', 'Chuyên khoa Da liễu', 'DERMATOLOGY', 'Khoa Da liễu chi nhánh Quận 7');

-- Tài khoản: KHÔNG có cột role, KHÔNG gắn chi nhánh (danh tính toàn cục)
INSERT INTO users (id, email, password_hash, full_name, phone) VALUES
('11111111-1111-1111-1111-111111111111', 'dr.minhanh@medsched.vn', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'BS.CKII Nguyễn Minh Anh', '0901234567'),
('22222222-2222-2222-2222-222222222222', 'benhnhan.demo@gmail.com', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'Trần Văn Hoàng', '0912345678'),
('33333333-3333-3333-3333-333333333333', 'letan.q1@medsched.vn', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'Lễ Tân Tiếp Đón 01', '0988776655');

-- Quyền nhân sự theo chi nhánh. Bác sĩ Minh Anh trực CẢ Q1 VÀ Q7 (2 dòng).
-- Tài khoản bệnh nhân (2222...) cố ý KHÔNG có dòng nào ở đây: mọi tài khoản
-- đều đặt lịch khám được ở mọi chi nhánh mà không cần cấp quyền.
INSERT INTO user_medical_center_roles (id, user_id, medical_center_id, role) VALUES
('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'ROLE_DOCTOR'),
('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'ROLE_DOCTOR'),
('77777777-7777-7777-7777-777777777773', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'ROLE_STAFF');

-- Cùng 1 user_id nhưng 2 hồ sơ bác sĩ ở 2 chuyên khoa/chi nhánh khác nhau
-- (hợp lệ nhờ UNIQUE(user_id, specialty_id) thay cho UNIQUE(user_id))
INSERT INTO doctors (id, user_id, specialty_id, academic_title, experience_years, consultation_fee, room_number, bio) VALUES
('44444444-4444-4444-4444-444444444441',
 '11111111-1111-1111-1111-111111111111',
 '55555555-5555-5555-5555-555555555551',
 'BS.CKII', 15, 300000.00, 'P.205', 'Chuyên gia đầu ngành Da liễu với hơn 15 năm kinh nghiệm điều trị.'),
('44444444-4444-4444-4444-444444444442',
 '11111111-1111-1111-1111-111111111111',
 '55555555-5555-5555-5555-555555555557',
 'BS.CKII', 15, 250000.00, 'P.101', 'Cùng bác sĩ trên, lịch trực chiều tại chi nhánh Quận 7.');

-- Hồ sơ người khám: toàn cục theo tài khoản, dùng được ở mọi chi nhánh
INSERT INTO patient_profiles (id, user_id, relationship, full_name, cccd_number, health_insurance_no, date_of_birth, gender, phone, address, medical_history) VALUES
('66666666-6666-6666-6666-666666666661',
 '22222222-2222-2222-2222-222222222222', 'SELF',
 'Trần Văn Hoàng', '079201008899', 'DN4790123456789', '2001-05-12', 'MALE', '0912345678', 'Quận 1, TP.HCM', 'Dị ứng phấn hoa nhẹ'),
('66666666-6666-6666-6666-666666666662',
 '22222222-2222-2222-2222-222222222222', 'PARENT',
 'Trần Văn Bảy (Bố)', '079060001234', 'GD4790987654321', '1960-03-20', 'MALE', '0912345678', 'Quận 1, TP.HCM', 'Tiền sử tăng huyết áp và đái tháo đường type 2');

INSERT INTO doctor_schedules (id, doctor_id, work_date, start_time, end_time, slot_duration_minutes, status) VALUES
('88888888-8888-8888-8888-888888888881', '44444444-4444-4444-4444-444444444441', '2026-09-10', '08:00:00', '12:00:00', 30, 'COMPLETED'),
('88888888-8888-8888-8888-888888888882', '44444444-4444-4444-4444-444444444442', '2026-09-12', '13:30:00', '17:00:00', 30, 'ACTIVE');

INSERT INTO time_slots (id, schedule_id, doctor_id, start_time, end_time, status) VALUES
('99999999-9999-9999-9999-999999999991', '88888888-8888-8888-8888-888888888881', '44444444-4444-4444-4444-444444444441', '2026-09-10 09:00:00', '2026-09-10 09:30:00', 'BOOKED'),
('99999999-9999-9999-9999-999999999992', '88888888-8888-8888-8888-888888888882', '44444444-4444-4444-4444-444444444442', '2026-09-12 14:00:00', '2026-09-12 14:30:00', 'BOOKED');

-- CHỨNG MINH SỬA ĐỔI [1]: cùng 1 patient_profile_id (66...61) có 2 ca khám ở
-- 2 medical_center_id khác nhau, dùng CHUNG 1 tài khoản users(22...22).
INSERT INTO appointments (id, booking_code, medical_center_id, patient_profile_id, doctor_id, slot_id, queue_number, queue_type, patient_symptoms, ai_summary, checkin_method, status, check_in_time) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'MS26091001', '00000000-0000-0000-0000-000000000001',
 '66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444441',
 '99999999-9999-9999-9999-999999999991', 'APP-1001', 'ONLINE_BOOKED',
 'Nổi mẩn đỏ vùng cổ và cánh tay 3 ngày, ngứa nhiều về đêm, đã tự bôi thuốc không đỡ.',
 'Bệnh nhân nam 25 tuổi, mẩn đỏ ngứa vùng cổ/tay 3 ngày, tự điều trị không hiệu quả. Tiền sử dị ứng phấn hoa.',
 'QR_CODE', 'COMPLETED', '2026-09-10 08:52:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'MS26091202', '00000000-0000-0000-0000-000000000002',
 '66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444442',
 '99999999-9999-9999-9999-999999999992', 'APP-2001', 'ONLINE_BOOKED',
 'Tái khám da liễu sau 2 ngày dùng thuốc, xin khám tại chi nhánh gần nhà (Quận 7).',
 'Tái khám viêm da dị ứng sau 2 ngày điều trị, chuyển chi nhánh theo yêu cầu bệnh nhân.',
 NULL, 'CONFIRMED', NULL);

INSERT INTO appointment_status_logs (id, appointment_id, from_status, to_status, reason, changed_by) VALUES
('ffffffff-ffff-ffff-ffff-fffffffffff1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CONFIRMED', 'CHECKED_IN', 'Quét mã QR vé hẹn tại quầy tiếp đón', '33333333-3333-3333-3333-333333333333'),
('ffffffff-ffff-ffff-ffff-fffffffffff2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'CHECKED_IN', 'IN_PROGRESS', 'Bác sĩ gọi vào phòng khám', '11111111-1111-1111-1111-111111111111'),
('ffffffff-ffff-ffff-ffff-fffffffffff3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'IN_PROGRESS', 'COMPLETED', 'Hoàn tất khám và kê đơn', '11111111-1111-1111-1111-111111111111');

INSERT INTO medical_records (id, appointment_id, diagnosis, doctor_notes) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
 'Viêm da dị ứng cấp (ICD-10: L23.9)',
 'Tránh tiếp xúc chất tẩy rửa, không chà xát vùng tổn thương. Tái khám sau 2 ngày nếu không giảm ngứa.');

-- [3] Danh mục thuốc của chi nhánh Q1
INSERT INTO medicines (id, medical_center_id, code, name, active_ingredient, unit) VALUES
('cccccccc-cccc-cccc-cccc-ccccccccccc1', '00000000-0000-0000-0000-000000000001', 'MED_CETIRIZIN', 'Cetirizine 10mg', 'Cetirizine hydrochloride', 'VIÊN'),
('cccccccc-cccc-cccc-cccc-ccccccccccc2', '00000000-0000-0000-0000-000000000001', 'MED_HYDROCOR', 'Hydrocortisone cream 1%', 'Hydrocortisone acetate', 'TUÝP'),
('cccccccc-cccc-cccc-cccc-ccccccccccc3', '00000000-0000-0000-0000-000000000001', 'MED_VITC', 'Vitamin C 500mg', 'Acid ascorbic', 'VIÊN');

-- CHỨNG MINH SỬA ĐỔI [3]: đơn thuốc là các DÒNG dữ liệu truy vấn/thống kê được,
-- không còn là 1 đoạn TEXT. Dòng thứ 2 là thuốc ngoài danh mục (medicine_id NULL)
-- nhưng vẫn lưu đủ medicine_name/unit làm bản chụp lúc kê đơn.
INSERT INTO prescription_items (id, medical_record_id, medicine_id, medicine_name, unit, dosage, frequency, duration_days, quantity, instruction) VALUES
('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'Cetirizine 10mg', 'VIÊN', '10mg', '1 lần/ngày, uống buổi tối', 5, 5.00, 'Uống sau ăn, có thể gây buồn ngủ nhẹ'),
('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
 NULL, 'Kem dưỡng ẩm Cetaphil (mua ngoài)', 'TUÝP', 'Thoa lớp mỏng', '2 lần/ngày sau khi rửa sạch', 7, 1.00, 'Thuốc ngoài danh mục bệnh viện, bệnh nhân tự mua tại nhà thuốc');

-- CHỨNG MINH SỬA ĐỔI [2]: 1 ca khám - 2 lần thu tiền khác phương thức.
-- Cọc online trước qua VNPay (có transaction_ref của cổng) + thu thêm tại quầy
-- bằng tiền mặt (không có transaction_ref, do lễ tân 33...33 thu).
INSERT INTO payments (id, appointment_id, amount, method, status, transaction_ref, paid_at, collected_by, note) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 100000.00, 'VNPAY', 'SUCCEEDED', 'VNPAY_26091013572468', '2026-09-09 21:15:00', NULL, 'Đặt cọc giữ chỗ online khi đặt lịch'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 200000.00, 'CASH', 'SUCCEEDED', NULL, '2026-09-10 08:53:00', '33333333-3333-3333-3333-333333333333', 'Thu phần còn lại tại quầy khi check-in (tổng phí khám 300.000đ)');

INSERT INTO doctor_reviews (id, appointment_id, patient_profile_id, doctor_id, rating, comment, ai_sentiment, is_anonymous) VALUES
('12121212-1212-1212-1212-121212121211', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
 '66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444441',
 5, 'Bác sĩ khám rất kỹ và giải thích dễ hiểu, quầy tiếp đón quét QR nhanh gọn.', 'POSITIVE', FALSE);
