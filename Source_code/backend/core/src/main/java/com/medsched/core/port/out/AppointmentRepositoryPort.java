package com.medsched.core.port.out;

import com.medsched.core.domain.model.Appointment;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Cổng ra để tầng nghiệp vụ đọc/ghi ca khám mà không phụ thuộc JPA.
 * Bản cài đặt nằm ở {@code app/adapter/out/persistence/AppointmentRepositoryAdapter}.
 */
public interface AppointmentRepositoryPort {

    Appointment save(Appointment appointment);

    Optional<Appointment> findById(String id);

    /** Dùng cho tiếp đón: quét mã QR trên vé hẹn ra đúng ca khám. */
    Optional<Appointment> findByBookingCode(String bookingCode);

    /** Lịch sử khám của một hồ sơ bệnh nhân, mới nhất trước. */
    List<Appointment> findByPatientProfileId(String patientProfileId);

    /** Đếm số ca khám của bác sĩ trong khoảng thời gian (dùng cấp STT tuần tự). */
    default long countByDoctorIdAndCreatedAtBetween(String doctorId, Instant start, Instant end) {
        return 0;
    }
}
