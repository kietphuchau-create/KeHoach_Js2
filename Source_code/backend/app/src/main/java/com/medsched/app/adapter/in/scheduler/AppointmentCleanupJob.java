package com.medsched.app.adapter.in.scheduler;

import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class AppointmentCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(AppointmentCleanupJob.class);

    private final AppointmentJpaRepository appointmentJpaRepository;
    private final TimeSlotJpaRepository timeSlotJpaRepository;

    public AppointmentCleanupJob(AppointmentJpaRepository appointmentJpaRepository,
                                 TimeSlotJpaRepository timeSlotJpaRepository) {
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.timeSlotJpaRepository = timeSlotJpaRepository;
    }

    /**
     * Tự động quét mỗi 5 phút.
     * Logic 1: Hủy các lịch hẹn CHƯA THANH TOÁN (PENDING) quá 15 phút.
     * Logic 2: Hủy các lịch hẹn ĐÃ THANH TOÁN (CONFIRMED) nhưng bệnh nhân không đến (quá 15 phút so với giờ bắt đầu ca khám).
     */
    @Scheduled(fixedDelay = 300000)
    @Transactional
    public void cleanupExpiredAppointments() {
        log.info("Bắt đầu tiến trình dọn dẹp các ca khám quá hạn...");
        Instant now = Instant.now();
        Instant fifteenMinsAgo = now.minus(15, ChronoUnit.MINUTES);

        // 1. Dọn dẹp ca khám PENDING (chưa thanh toán quá 15 phút)
        List<AppointmentEntity> pendingAppointments = appointmentJpaRepository.findAll().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.PENDING)
                .filter(a -> a.getCreatedAt().isBefore(fifteenMinsAgo))
                .toList();

        for (AppointmentEntity appt : pendingAppointments) {
            cancelAppointment(appt, "Hệ thống tự động hủy do không thanh toán trong thời gian quy định (15 phút).");
        }

        // 2. Dọn dẹp ca khám CONFIRMED nhưng đến trễ > 15 phút (TC_FM_PAT_01)
        List<AppointmentEntity> confirmedAppointments = appointmentJpaRepository.findAll().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED)
                .toList();

        for (AppointmentEntity appt : confirmedAppointments) {
            if (appt.getSlotId() != null) {
                timeSlotJpaRepository.findById(appt.getSlotId()).ifPresent(slot -> {
                    // Nếu thời gian bắt đầu của slot đã qua 15 phút
                    if (slot.getStartTime().isBefore(fifteenMinsAgo)) {
                        cancelAppointment(appt, "Hệ thống tự động hủy do bệnh nhân đến trễ quá 15 phút so với giờ hẹn.");
                    }
                });
            }
        }

        log.info("Hoàn tất dọn dẹp. Đã hủy {} ca PENDING, {} ca CONFIRMED trễ giờ.", pendingAppointments.size(), confirmedAppointments.size());
    }

    private void cancelAppointment(AppointmentEntity appt, String reason) {
        log.info("Hủy ca khám ID: {} - Lý do: {}", appt.getId(), reason);
        appt.setStatus(AppointmentStatus.CANCELLED);
        appt.setPatientSymptoms((appt.getPatientSymptoms() == null ? "" : appt.getPatientSymptoms() + "\n") + "[AUTO-CANCEL]: " + reason);
        appt.setUpdatedAt(Instant.now());
        appointmentJpaRepository.save(appt);

        // Giải phóng Slot
        if (appt.getSlotId() != null) {
            timeSlotJpaRepository.findById(appt.getSlotId()).ifPresent(slot -> {
                slot.setStatus(SlotStatus.AVAILABLE);
                timeSlotJpaRepository.save(slot);
            });
        }
    }
}
