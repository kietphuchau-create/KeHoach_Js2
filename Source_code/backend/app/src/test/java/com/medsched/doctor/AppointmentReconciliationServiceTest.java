package com.medsched.doctor;

import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AppointmentReconciliationServiceTest {

    @Mock
    private AppointmentJpaRepository appointmentRepo;

    private AppointmentReconciliationService service;

    @BeforeEach
    void setUp() {
        service = new AppointmentReconciliationService(appointmentRepo);
    }

    @Test
    @DisplayName("Tự động chuyển các ca khám dở dang của ngày hôm trước sang MISSED_NO_SHOW")
    void givenStaleAppointments_whenReconcile_thenUpdateToMissedNoShow() {
        Instant yesterday = Instant.now().minus(2, ChronoUnit.DAYS);

        AppointmentEntity appt = new AppointmentEntity(
                "app-stale", "MED-STALE", "c-1", "p-1", "doc-1", "slot-1",
                "01", QueueType.ONLINE_BOOKED, "Trieu chung", AppointmentStatus.CHECKED_IN,
                yesterday, yesterday
        );
        appt.setCheckInTime(yesterday);

        given(appointmentRepo.findAll()).willReturn(List.of(appt));

        int reconciled = service.reconcileStaleAppointments();

        assertThat(reconciled).isEqualTo(1);
        assertThat(appt.getStatus()).isEqualTo(AppointmentStatus.MISSED_NO_SHOW);
        verify(appointmentRepo).save(any());
    }

    @Test
    @DisplayName("Không xử lý nếu danh sách ca rỗng hoặc không có ca cũ")
    void givenNoStaleAppointments_whenReconcile_thenReturnZero() {
        given(appointmentRepo.findAll()).willReturn(List.of());

        int reconciled = service.reconcileStaleAppointments();
        assertThat(reconciled).isEqualTo(0);
    }
}
