-- Flyway V2 - dữ liệu mẫu (MySQL/MariaDB - XAMPP), đồng bộ với bản PostgreSQL
--
-- Seed này được thiết kế để CHỨNG MINH 3 sửa đổi thiết kế của phiên bản 3.0:
--   [1] 2 chi nhánh (Q1, Q7); 1 tài khoản bệnh nhân DUY NHẤT có ca khám ở CẢ
--       HAI chi nhánh (không cần tạo account thứ hai); 1 bác sĩ trực ở cả hai.
--   [2] 1 ca khám có 2 dòng payments (cọc VNPay online + thu thêm tại quầy).
--   [3] Đơn thuốc là 2 dòng prescription_items (1 thuốc trong danh mục,
--       1 thuốc ngoài danh mục với medicine_id = NULL).

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

-- Danh mục dịch vụ khám (bảng giá) của từng chuyên khoa - phục vụ CRUD service
INSERT INTO services (id, specialty_id, name, code, description, price, estimated_duration_minutes) VALUES
('5e100000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555551', 'Khám Da liễu cơ bản', 'DERM_BASIC', 'Khám và tư vấn các bệnh da liễu thông thường', 300000.00, 30),
('5e100000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555551', 'Điều trị Laser vết nám', 'DERM_LASER', 'Điều trị nám, tàn nhang bằng công nghệ laser', 1200000.00, 45),
('5e100000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555552', 'Khám Nội tổng quát', 'INT_BASIC', 'Khám nội khoa tổng quát, đo huyết áp, tư vấn dinh dưỡng', 250000.00, 30);

-- Tài khoản: KHÔNG có cột role, KHÔNG gắn chi nhánh (danh tính toàn cục)
-- Mật khẩu của TẤT CẢ tài khoản mẫu: Medsched@123 (hash BCrypt cost 10).
-- Dùng để đăng nhập thử 4 luồng Login của Task 1.
INSERT INTO users (id, email, password_hash, full_name, phone) VALUES
('11111111-1111-1111-1111-111111111111', 'dr.minhanh@medsched.vn', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'BS.CKII Nguyễn Minh Anh', '0901234567'),
('22222222-2222-2222-2222-222222222222', 'benhnhan.demo@gmail.com', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Trần Văn Hoàng', '0912345678'),
('33333333-3333-3333-3333-333333333333', 'letan.q1@medsched.vn', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Lễ Tân Tiếp Đón 01', '0988776655'),
('ad000000-0000-0000-0000-000000000001', 'admin@medsched.vn', '$2a$10$ahoI91g3N9UKv5TBC8/KnugbB5LeGWqti0P/cwgrxYh..X9Jxxwti', 'Quản Trị Viên Hệ Thống', '0900000001');

-- Quyền nhân sự theo chi nhánh. Bác sĩ Minh Anh trực CẢ Q1 VÀ Q7 (2 dòng).
-- Tài khoản bệnh nhân (2222...) cố ý KHÔNG có dòng nào ở đây: mọi tài khoản
-- đều đặt lịch khám được ở mọi chi nhánh mà không cần cấp quyền.
INSERT INTO user_medical_center_roles (id, user_id, medical_center_id, role) VALUES
('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'ROLE_DOCTOR'),
('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'ROLE_DOCTOR'),
('77777777-7777-7777-7777-777777777773', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'ROLE_STAFF'),
('77777777-7777-7777-7777-777777777774', 'ad000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ROLE_ADMIN');

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
