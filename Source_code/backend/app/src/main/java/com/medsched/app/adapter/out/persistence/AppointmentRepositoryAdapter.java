package com.medsched.app.adapter.out.persistence;

import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.CheckinMethod;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Nối cổng ra {@link AppointmentRepositoryPort} xuống tầng JPA có sẵn.
 * <p>
 * Đây là chỗ duy nhất biết cả hai thế giới: bản ghi thuần {@link Appointment}
 * của tầng nghiệp vụ và {@link AppointmentEntity} của Hibernate. Nhờ vậy tầng
 * nghiệp vụ không phải phụ thuộc JPA.
 */
@Component
public class AppointmentRepositoryAdapter implements AppointmentRepositoryPort {

    private final AppointmentJpaRepository appointments;

    public AppointmentRepositoryAdapter(AppointmentJpaRepository appointments) {
        this.appointments = appointments;
    }

    @Override
    @Transactional
    public Appointment save(Appointment appointment) {
        AppointmentEntity entity = appointments.findById(appointment.id())
                .orElseGet(() -> newEntity(appointment));
        applyChanges(entity, appointment);
        return toDomain(appointments.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Appointment> findById(String id) {
        return appointments.findById(id).map(AppointmentRepositoryAdapter::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Appointment> findByBookingCode(String bookingCode) {
        return appointments.findByBookingCode(bookingCode).map(AppointmentRepositoryAdapter::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Appointment> findByPatientProfileId(String patientProfileId) {
        List<Appointment> result = new ArrayList<>();
        for (AppointmentEntity entity : appointments.findByPatientProfileIdOrderByCreatedAtDesc(patientProfileId)) {
            result.add(toDomain(entity));
        }
        return result;
    }

    private static AppointmentEntity newEntity(Appointment a) {
        return new AppointmentEntity(
                a.id(), a.bookingCode(), a.medicalCenterId(), a.patientProfileId(), a.doctorId(), a.slotId(),
                a.queueNumber(), parseEnum(QueueType.class, a.queueType(), QueueType.ONLINE_BOOKED),
                a.patientSymptoms(),
                parseEnum(AppointmentStatus.class, a.status(), AppointmentStatus.CONFIRMED),
                a.createdAt(), a.updatedAt());
    }

    /** Chỉ chép các trường tầng nghiệp vụ được phép đổi; audit do DB/JPA giữ. */
    private static void applyChanges(AppointmentEntity entity, Appointment a) {
        entity.setAiSummary(a.aiSummary());
        entity.setStatus(parseEnum(AppointmentStatus.class, a.status(), AppointmentStatus.CONFIRMED));
        entity.setCheckinMethod(parseEnum(CheckinMethod.class, a.checkinMethod(), null));
        entity.setCheckInTime(a.checkInTime());
        entity.setDelayed(a.isDelayed());
        entity.setDelayMinutes(a.delayMinutes());
        entity.setUpdatedAt(a.updatedAt());
    }

    private static Appointment toDomain(AppointmentEntity e) {
        return new Appointment(
                e.getId(), e.getBookingCode(), e.getMedicalCenterId(), e.getPatientProfileId(), e.getDoctorId(),
                e.getSlotId(), e.getQueueNumber(), name(e.getQueueType()), e.getPatientSymptoms(), e.getAiSummary(),
                name(e.getCheckinMethod()), name(e.getStatus()), e.isDelayed(), e.getDelayMinutes(),
                e.getCheckInTime(), e.getCreatedAt(), e.getUpdatedAt());
    }

    private static String name(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private static <E extends Enum<E>> E parseEnum(Class<E> type, String value, E fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return Enum.valueOf(type, value);
        } catch (IllegalArgumentException ex) {
            return fallback;
        }
    }
}
