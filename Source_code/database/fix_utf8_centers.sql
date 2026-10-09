SET NAMES utf8mb4;
USE medsched_db;

UPDATE medical_centers 
SET name = 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1' 
WHERE code = 'MED_Q1';

UPDATE medical_centers 
SET name = 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 7' 
WHERE code = 'MED_Q7';

SELECT code, name FROM medical_centers;
