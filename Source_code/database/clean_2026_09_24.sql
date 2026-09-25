-- Xóa sạch dữ liệu mẫu ca khám ngày 2026-09-24 (7 appointments và các liên kết)
START TRANSACTION;

-- 1. Xóa chi tiết đơn thuốc
DELETE pi FROM prescription_items pi
JOIN prescriptions pr ON pi.prescription_id = pr.id
WHERE pr.appointment_id LIKE '50b2c3d4-000%';

-- 2. Xóa đơn thuốc
DELETE FROM prescriptions WHERE appointment_id LIKE '50b2c3d4-000%';

-- 3. Xóa hồ sơ bệnh án
DELETE FROM medical_records WHERE appointment_id LIKE '50b2c3d4-000%';

-- 4. Xóa thanh toán / hóa đơn
DELETE FROM payments WHERE appointment_id LIKE '50b2c3d4-000%';
DELETE FROM invoices WHERE appointment_id LIKE '50b2c3d4-000%';

-- 5. Xóa log và đánh giá
DELETE FROM appointment_status_logs WHERE appointment_id LIKE '50b2c3d4-000%';
DELETE FROM doctor_reviews WHERE appointment_id LIKE '50b2c3d4-000%';

-- 6. Xóa 7 lịch hẹn khám ngày 2026-09-24
DELETE FROM appointments WHERE id LIKE '50b2c3d4-000%';

-- 7. Xóa toàn bộ time-slots của ca trực ngày 2026-09-24 (BS.CKII Nguyễn Minh Anh)
DELETE FROM time_slots WHERE schedule_id = '30b2c3d4-0001-4000-8000-000000000001';

-- 8. Xóa ca trực ngày 2026-09-24 khỏi danh sách ca trực bác sĩ
DELETE FROM doctor_schedules WHERE id = '30b2c3d4-0001-4000-8000-000000000001';

COMMIT;
