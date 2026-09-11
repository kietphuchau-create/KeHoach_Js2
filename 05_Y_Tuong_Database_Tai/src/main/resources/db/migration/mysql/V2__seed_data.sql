-- Flyway V2 - dữ liệu mẫu (MySQL/MariaDB - XAMPP), đồng bộ với bản PostgreSQL

INSERT INTO medical_centers (id, code, name, address, phone) VALUES
('00000000-0000-0000-0000-000000000001', 'MED_Q1', 'Bệnh Viện Đa Khoa MedSched - Chi Nhánh Quận 1', 'Số 123 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1, TP.HCM', '02839123456');

INSERT INTO system_settings (id, medical_center_id, setting_key, setting_value, description) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DEFAULT_SLOT_DURATION_MINUTES', '30', 'Thời lượng khám mặc định cho mỗi ca'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'BUFFER_TIME_MINUTES', '5', 'Thời gian chuẩn bị giữa 2 ca khám'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'CANCELLATION_LIMIT_HOURS', '2', 'Cho phép hủy lịch hẹn trước tối thiểu 2 giờ'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'MAX_NO_SHOW_PENALTY', '3', 'Số lần bỏ hẹn tối đa trước khi bị hạn chế đặt online');

INSERT INTO specialties (id, medical_center_id, name, code, description) VALUES
('55555555-5555-5555-5555-555555555551', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Da liễu', 'DERMATOLOGY', 'Chẩn đoán và điều trị bệnh ngoài da, mẩn ngứa, viêm da dị ứng'),
('55555555-5555-5555-5555-555555555552', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Nội tổng quát', 'INTERNAL_MEDICINE', 'Khám nội khoa người lớn, tim mạch, huyết áp, tiêu hóa'),
('55555555-5555-5555-5555-555555555553', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Răng Hàm Mặt', 'ODONTO_STOMATOLOGY', 'Chăm sóc, điều trị và phục hình răng miệng'),
('55555555-5555-5555-5555-555555555554', '00000000-0000-0000-0000-000000000001', 'Chuyên khoa Mắt', 'OPHTHALMOLOGY', 'Khám thị lực và điều trị khúc xạ, bệnh lý mắt');

INSERT INTO users (id, medical_center_id, email, password_hash, full_name, phone, role) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'dr.minhanh@medsched.vn', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'BS.CKII Nguyễn Minh Anh', '0901234567', 'ROLE_DOCTOR'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'benhnhan.demo@gmail.com', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'Trần Văn Hoàng', '0912345678', 'ROLE_PATIENT'),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'letan.q1@medsched.vn', '$2a$10$rN6NY395V9uszxxN3QEGu.maNnA7xSWa6oEmHZe6DBNryOXAfKVd.', 'Lễ Tân Tiếp Đón 01', '0988776655', 'ROLE_STAFF');

INSERT INTO doctors (id, user_id, specialty_id, academic_title, experience_years, consultation_fee, room_number, bio) VALUES
('44444444-4444-4444-4444-444444444441',
 '11111111-1111-1111-1111-111111111111',
 '55555555-5555-5555-5555-555555555551',
 'BS.CKII', 15, 300000.00, 'P.205', 'Chuyên gia đầu ngành Da liễu với hơn 15 năm kinh nghiệm điều trị.');

INSERT INTO patient_profiles (id, user_id, relationship, full_name, cccd_number, health_insurance_no, date_of_birth, gender, phone, address, medical_history) VALUES
('66666666-6666-6666-6666-666666666661',
 '22222222-2222-2222-2222-222222222222', 'SELF',
 'Trần Văn Hoàng', '079201008899', 'DN4790123456789', '2001-05-12', 'MALE', '0912345678', 'Quận 1, TP.HCM', 'Dị ứng phấn hoa nhẹ'),
('66666666-6666-6666-6666-666666666662',
 '22222222-2222-2222-2222-222222222222', 'PARENT',
 'Trần Văn Bảy (Bố)', '079060001234', 'GD4790987654321', '1960-03-20', 'MALE', '0912345678', 'Quận 1, TP.HCM', 'Tiền sử tăng huyết áp và đái tháo đường type 2');
