-- ====================================================================
-- Flyway V1 - MedSched persistence prototype (MySQL/MariaDB - XAMPP)
-- Tương đương 04_Database_Design/medsched_schema_mysql_xampp.sql (đã kiểm
-- thử thực tế trên MariaDB 10.4.32 đi kèm XAMPP), nhưng bỏ DEFAULT (UUID()),
-- DROP TABLE và CREATE DATABASE/USE vì Flyway migrate trên 1 database có sẵn
-- và id luôn do tầng ứng dụng sinh trước khi insert (khớp String id trong entity).
-- ====================================================================

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

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    medical_center_id VARCHAR(36),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(32) NOT NULL CHECK (role IN ('ROLE_PATIENT', 'ROLE_DOCTOR', 'ROLE_STAFF', 'ROLE_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_users_center FOREIGN KEY (medical_center_id) REFERENCES medical_centers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE specialties (
    id VARCHAR(36) PRIMARY KEY,
    medical_center_id VARCHAR(36),
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

CREATE TABLE doctors (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
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
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_doctors_specialty FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE appointments (
    id VARCHAR(36) PRIMARY KEY,
    booking_code VARCHAR(16) NOT NULL UNIQUE,
    patient_profile_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) NOT NULL,
    slot_id VARCHAR(36),
    queue_number VARCHAR(20) NOT NULL,
    queue_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE_BOOKED' CHECK (queue_type IN ('ONLINE_BOOKED', 'WALKIN', 'POST_LAB_RESULT')),
    patient_symptoms TEXT,
    ai_summary TEXT,
    checkin_method VARCHAR(30) CHECK (checkin_method IN ('QR_CODE', 'CCCD_QR', 'MANUAL')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID_AT_COUNTER', 'DEPOSITED_VNPAY', 'REFUNDED')),
    payment_amount DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
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
    CONSTRAINT fk_appt_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appt_slot FOREIGN KEY (slot_id) REFERENCES time_slots(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_appointments_patient ON appointments(patient_profile_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_queue ON appointments(doctor_id, queue_type, status);

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

CREATE TABLE medical_records (
    id VARCHAR(36) PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL UNIQUE,
    diagnosis TEXT NOT NULL,
    doctor_notes TEXT,
    prescription TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    CONSTRAINT fk_records_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
