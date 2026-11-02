-- Lịch trực và khung giờ thử nghiệm cho chức năng đặt lịch MedSched.
-- Phạm vi: 4 bác sĩ, ngày 03-04/11/2026, đủ 6 giờ/ngày.
-- Mỗi ngày gồm ca sáng 08:00-12:00 và ca chiều 13:30-15:30.
-- Slot khám: 30 phút, trạng thái AVAILABLE.
-- doctor_schedules dùng ngày/giờ địa phương; time_slots ánh xạ Java Instant nên
-- được lưu UTC (giờ Việt Nam trừ 7 giờ) để API hiển thị đúng Asia/Ho_Chi_Minh.
-- Script có thể chạy lại; ca trùng/chéo giờ sẽ được bỏ qua và slot đã có không bị tạo lại.

USE medsched_db;
SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO doctor_schedules (
    id,
    doctor_id,
    work_date,
    start_time,
    end_time,
    slot_duration_minutes,
    status,
    created_by,
    is_test_data
)
SELECT
    seed.id,
    seed.doctor_id,
    seed.work_date,
    seed.start_time,
    seed.end_time,
    30,
    'ACTIVE',
    'e1b2c3d4-0001-4000-8000-000000000001',
    TRUE
FROM (
    -- Ngày 03/11/2026
    SELECT '30b2c3d4-0101-4000-8000-000000000001' AS id, '10b2c3d4-0001-4000-8000-000000000001' AS doctor_id, DATE('2026-11-03') AS work_date, TIME('08:00:00') AS start_time, TIME('12:00:00') AS end_time
    UNION ALL SELECT '31b2c3d4-0101-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', DATE('2026-11-03'), TIME('13:30:00'), TIME('15:30:00')
    UNION ALL SELECT '30b2c3d4-0102-4000-8000-000000000002', '10b2c3d4-0002-4000-8000-000000000002', DATE('2026-11-03'), TIME('08:00:00'), TIME('12:00:00')
    UNION ALL SELECT '31b2c3d4-0102-4000-8000-000000000002', '10b2c3d4-0002-4000-8000-000000000002', DATE('2026-11-03'), TIME('13:30:00'), TIME('15:30:00')
    UNION ALL SELECT '30b2c3d4-0103-4000-8000-000000000003', '10b2c3d4-0003-4000-8000-000000000003', DATE('2026-11-03'), TIME('08:00:00'), TIME('12:00:00')
    UNION ALL SELECT '31b2c3d4-0103-4000-8000-000000000003', '10b2c3d4-0003-4000-8000-000000000003', DATE('2026-11-03'), TIME('13:30:00'), TIME('15:30:00')
    UNION ALL SELECT '30b2c3d4-0104-4000-8000-000000000004', '10b2c3d4-0004-4000-8000-000000000004', DATE('2026-11-03'), TIME('08:00:00'), TIME('12:00:00')
    UNION ALL SELECT '31b2c3d4-0104-4000-8000-000000000004', '10b2c3d4-0004-4000-8000-000000000004', DATE('2026-11-03'), TIME('13:30:00'), TIME('15:30:00')

    -- Ngày 04/11/2026
    UNION ALL SELECT '30b2c3d4-0201-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', DATE('2026-11-04'), TIME('08:00:00'), TIME('12:00:00')
    UNION ALL SELECT '31b2c3d4-0201-4000-8000-000000000001', '10b2c3d4-0001-4000-8000-000000000001', DATE('2026-11-04'), TIME('13:30:00'), TIME('15:30:00')
    UNION ALL SELECT '30b2c3d4-0202-4000-8000-000000000002', '10b2c3d4-0002-4000-8000-000000000002', DATE('2026-11-04'), TIME('08:00:00'), TIME('12:00:00')
    UNION ALL SELECT '31b2c3d4-0202-4000-8000-000000000002', '10b2c3d4-0002-4000-8000-000000000002', DATE('2026-11-04'), TIME('13:30:00'), TIME('15:30:00')
    UNION ALL SELECT '30b2c3d4-0203-4000-8000-000000000003', '10b2c3d4-0003-4000-8000-000000000003', DATE('2026-11-04'), TIME('08:00:00'), TIME('12:00:00')
    UNION ALL SELECT '31b2c3d4-0203-4000-8000-000000000003', '10b2c3d4-0003-4000-8000-000000000003', DATE('2026-11-04'), TIME('13:30:00'), TIME('15:30:00')
    UNION ALL SELECT '30b2c3d4-0204-4000-8000-000000000004', '10b2c3d4-0004-4000-8000-000000000004', DATE('2026-11-04'), TIME('08:00:00'), TIME('12:00:00')
    UNION ALL SELECT '31b2c3d4-0204-4000-8000-000000000004', '10b2c3d4-0004-4000-8000-000000000004', DATE('2026-11-04'), TIME('13:30:00'), TIME('15:30:00')
) AS seed
WHERE NOT EXISTS (
    SELECT 1
    FROM doctor_schedules existing
    WHERE existing.doctor_id = seed.doctor_id
      AND existing.work_date = seed.work_date
      AND existing.status = 'ACTIVE'
      AND seed.start_time < existing.end_time
      AND seed.end_time > existing.start_time
);

-- Sửa một lần các slot của chính script này nếu chúng từng được nạp nhầm theo
-- giờ Việt Nam. Điều kiện so sánh với giờ bắt đầu ca giúp câu UPDATE idempotent:
-- sau khi trừ 7 giờ, các bản ghi không còn thỏa điều kiện ở lần chạy kế tiếp.
UPDATE time_slots slot
JOIN doctor_schedules schedule ON schedule.id = slot.schedule_id
SET
    slot.start_time = TIMESTAMPADD(HOUR, -7, slot.start_time),
    slot.end_time = TIMESTAMPADD(HOUR, -7, slot.end_time)
WHERE schedule.id IN (
    '30b2c3d4-0101-4000-8000-000000000001', '31b2c3d4-0101-4000-8000-000000000001',
    '30b2c3d4-0102-4000-8000-000000000002', '31b2c3d4-0102-4000-8000-000000000002',
    '30b2c3d4-0103-4000-8000-000000000003', '31b2c3d4-0103-4000-8000-000000000003',
    '30b2c3d4-0104-4000-8000-000000000004', '31b2c3d4-0104-4000-8000-000000000004',
    '30b2c3d4-0201-4000-8000-000000000001', '31b2c3d4-0201-4000-8000-000000000001',
    '30b2c3d4-0202-4000-8000-000000000002', '31b2c3d4-0202-4000-8000-000000000002',
    '30b2c3d4-0203-4000-8000-000000000003', '31b2c3d4-0203-4000-8000-000000000003',
    '30b2c3d4-0204-4000-8000-000000000004', '31b2c3d4-0204-4000-8000-000000000004'
)
  AND slot.start_time >= TIMESTAMP(schedule.work_date, schedule.start_time);

-- Sinh các slot 30 phút cho những ca test vừa tạo.
INSERT INTO time_slots (
    id,
    schedule_id,
    doctor_id,
    start_time,
    end_time,
    status,
    version,
    created_by
)
SELECT
    UUID(),
    schedule.id,
    schedule.doctor_id,
    TIMESTAMPADD(
        MINUTE,
        slot_number.n * 30,
        TIMESTAMPADD(HOUR, -7, TIMESTAMP(schedule.work_date, schedule.start_time))
    ),
    TIMESTAMPADD(
        MINUTE,
        (slot_number.n + 1) * 30,
        TIMESTAMPADD(HOUR, -7, TIMESTAMP(schedule.work_date, schedule.start_time))
    ),
    'AVAILABLE',
    0,
    'e1b2c3d4-0001-4000-8000-000000000001'
FROM doctor_schedules schedule
CROSS JOIN (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
) AS slot_number
WHERE schedule.id IN (
    '30b2c3d4-0101-4000-8000-000000000001', '31b2c3d4-0101-4000-8000-000000000001',
    '30b2c3d4-0102-4000-8000-000000000002', '31b2c3d4-0102-4000-8000-000000000002',
    '30b2c3d4-0103-4000-8000-000000000003', '31b2c3d4-0103-4000-8000-000000000003',
    '30b2c3d4-0104-4000-8000-000000000004', '31b2c3d4-0104-4000-8000-000000000004',
    '30b2c3d4-0201-4000-8000-000000000001', '31b2c3d4-0201-4000-8000-000000000001',
    '30b2c3d4-0202-4000-8000-000000000002', '31b2c3d4-0202-4000-8000-000000000002',
    '30b2c3d4-0203-4000-8000-000000000003', '31b2c3d4-0203-4000-8000-000000000003',
    '30b2c3d4-0204-4000-8000-000000000004', '31b2c3d4-0204-4000-8000-000000000004'
)
  AND TIMESTAMPADD(MINUTE, (slot_number.n + 1) * 30, TIMESTAMP(schedule.work_date, schedule.start_time))
      <= TIMESTAMP(schedule.work_date, schedule.end_time)
  AND NOT EXISTS (
      SELECT 1
      FROM time_slots existing_slot
      WHERE existing_slot.schedule_id = schedule.id
        AND existing_slot.start_time = TIMESTAMPADD(
            MINUTE,
            slot_number.n * 30,
            TIMESTAMPADD(HOUR, -7, TIMESTAMP(schedule.work_date, schedule.start_time))
        )
  );

COMMIT;

-- Kiểm tra nhanh sau khi chạy:
-- SELECT u.email, ds.work_date, ds.start_time, ds.end_time, COUNT(ts.id) AS slots
-- FROM doctor_schedules ds
-- JOIN doctors d ON d.id = ds.doctor_id
-- JOIN users u ON u.id = d.user_id
-- LEFT JOIN time_slots ts ON ts.schedule_id = ds.id
-- WHERE ds.work_date BETWEEN '2026-11-03' AND '2026-11-04'
-- GROUP BY ds.id
-- ORDER BY ds.work_date, u.email, ds.start_time;
