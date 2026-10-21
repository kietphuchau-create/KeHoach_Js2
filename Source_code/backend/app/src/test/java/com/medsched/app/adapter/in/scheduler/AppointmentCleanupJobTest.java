package com.medsched.app.adapter.in.scheduler;

import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AppointmentCleanupJobTest {

    @Mock
    private AppointmentJpaRepository appointmentJpaRepository;
    @Mock
    private TimeSlotJpaRepository timeSlotJpaRepository;

    private AppointmentCleanupJob job;

    @BeforeEach
    void setUp() {
        job = new AppointmentCleanupJob(appointmentJpaRepository, timeSlotJpaRepository);
    }

    @Test
    @DisplayName("Tự động hủy ca PENDING quá 15 phút và giải phóng slot")
    void givenExpiredPendingAppointment_whenCleanup_thenCancelAndReleaseSlot() {
        Instant thirtyMinsAgo = Instant.now().minus(30, ChronoUnit.MINUTES);

        AppointmentEntity appt = new AppointmentEntity(
                "app-expired", "MED-EXP", "c-1", "p-1", "doc-1", "slot-1",
                "01", QueueType.ONLINE_BOOKED, "Trieu chung", AppointmentStatus.PENDING,
                thirtyMinsAgo, thirtyMinsAgo
        );

        TimeSlotEntity slot = new TimeSlotEntity(
                "slot-1", "sch-1", "doc-1",
                thirtyMinsAgo, thirtyMinsAgo.plusSeconds(1800),
                SlotStatus.BOOKED, thirtyMinsAgo, thirtyMinsAgo
        );

        given(appointmentJpaRepository.findAll()).willReturn(List.of(appt));
        given(timeSlotJpaRepository.findById("slot-1")).willReturn(Optional.of(slot));

        job.cleanupExpiredAppointments();

        verify(appointmentJpaRepository).save(any());
        verify(timeSlotJpaRepository).save(any());
    }

    @Test
    @DisplayName("Tự động chuyển ca CONFIRMED trễ hơn 15 phút sang MISSED_NO_SHOW và KHÔNG giải phóng slot quá khứ")
    void givenExpiredConfirmedAppointment_whenCleanup_thenMarkMissedNoShowWithoutReleasingSlot() {
        Instant thirtyMinsAgo = Instant.now().minus(30, ChronoUnit.MINUTES);

        AppointmentEntity appt = new AppointmentEntity(
                "app-confirmed", "MED-CONF", "c-1", "p-1", "doc-1", "slot-past",
                "02", QueueType.ONLINE_BOOKED, "Đã thanh toán", AppointmentStatus.CONFIRMED,
                thirtyMinsAgo.minusSeconds(3600), thirtyMinsAgo.minusSeconds(3600)
        );

        TimeSlotEntity slot = new TimeSlotEntity(
                "slot-past", "sch-1", "doc-1",
                thirtyMinsAgo, thirtyMinsAgo.plusSeconds(1800),
                SlotStatus.BOOKED, thirtyMinsAgo, thirtyMinsAgo
        );

        given(appointmentJpaRepository.findAll()).willReturn(List.of(appt));
        given(timeSlotJpaRepository.findById("slot-past")).willReturn(Optional.of(slot));

        job.cleanupExpiredAppointments();

        verify(appointmentJpaRepository).save(org.mockito.ArgumentMatchers.argThat(savedAppt ->
                savedAppt.getId().equals("app-confirmed") &&
                savedAppt.getStatus() == AppointmentStatus.MISSED_NO_SHOW
        ));
        // Slot trong quá khứ KHÔNG được lưu đè lại thành AVAILABLE
        verify(timeSlotJpaRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("Ca CONFIRMED mới bắt đầu 5 phút trước thì KHÔNG bị đánh dấu vắng mặt")
    void givenRecentConfirmedAppointment_whenCleanup_thenDoNotMarkNoShow() {
        Instant fiveMinsAgo = Instant.now().minus(5, ChronoUnit.MINUTES);

        AppointmentEntity appt = new AppointmentEntity(
                "app-recent", "MED-REC", "c-1", "p-1", "doc-1", "slot-recent",
                "03", QueueType.ONLINE_BOOKED, "Đã thanh toán", AppointmentStatus.CONFIRMED,
                fiveMinsAgo.minusSeconds(1000), fiveMinsAgo.minusSeconds(1000)
        );

        TimeSlotEntity slot = new TimeSlotEntity(
                "slot-recent", "sch-1", "doc-1",
                fiveMinsAgo, fiveMinsAgo.plusSeconds(1800),
                SlotStatus.BOOKED, fiveMinsAgo, fiveMinsAgo
        );

        given(appointmentJpaRepository.findAll()).willReturn(List.of(appt));
        given(timeSlotJpaRepository.findById("slot-recent")).willReturn(Optional.of(slot));

        job.cleanupExpiredAppointments();

        verify(appointmentJpaRepository, org.mockito.Mockito.never()).save(any());
        verify(timeSlotJpaRepository, org.mockito.Mockito.never()).save(any());
    }
}
