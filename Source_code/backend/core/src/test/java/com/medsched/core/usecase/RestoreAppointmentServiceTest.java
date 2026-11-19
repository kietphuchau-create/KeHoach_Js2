package com.medsched.core.usecase;

import com.medsched.core.domain.exception.SlotNotAvailableException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.domain.model.TimeSlot;
import com.medsched.core.port.in.RestoreAppointmentUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class RestoreAppointmentServiceTest {

    @Mock
    private AppointmentRepositoryPort appointmentRepository;

    @Mock
    private TimeSlotRepositoryPort timeSlotRepository;

    private RestoreAppointmentService restoreService;

    @BeforeEach
    void setUp() {
        restoreService = new RestoreAppointmentService(appointmentRepository, timeSlotRepository);
    }

    @Test
    @DisplayName("Khôi phục thành công khi slot còn AVAILABLE và thời gian trong tương lai")
    void givenCancelledAppointment_whenSlotAvailable_thenRestoreSuccess() {
        Instant futureStart = Instant.now().plus(2, ChronoUnit.DAYS);
        Instant futureEnd = futureStart.plus(30, ChronoUnit.MINUTES);
        TimeSlot slot = new TimeSlot("slot-1", "sch-1", futureStart, futureEnd, "AVAILABLE", 0);

        Appointment cancelledApp = new Appointment(
                "app-1", "MED-888", "center-1", "patient-1", "doc-1", "slot-1",
                "Q-1", "ONLINE_BOOKED", "Đau răng", null, null, "CANCELLED",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(appointmentRepository.findById("app-1")).willReturn(Optional.of(cancelledApp));
        given(timeSlotRepository.findById("slot-1")).willReturn(Optional.of(slot));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(cancelledApp));
        given(timeSlotRepository.lockSlot("slot-1")).willReturn(true);
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(inv -> inv.getArgument(0));

        Appointment restored = restoreService.restore(new RestoreAppointmentUseCase.Command("app-1"));

        assertThat(restored).isNotNull();
        assertThat(restored.status()).isEqualTo("CONFIRMED");
    }

    @Test
    @DisplayName("Khôi phục thất bại khi slot đã bị người khác đặt mất (lockSlot trả về false)")
    void givenCancelledAppointment_whenSlotTakenByOthers_thenThrowSlotNotAvailableException() {
        Instant futureStart = Instant.now().plus(2, ChronoUnit.DAYS);
        Instant futureEnd = futureStart.plus(30, ChronoUnit.MINUTES);
        TimeSlot slot = new TimeSlot("slot-1", "sch-1", futureStart, futureEnd, "AVAILABLE", 0);

        Appointment cancelledApp = new Appointment(
                "app-1", "MED-888", "center-1", "patient-1", "doc-1", "slot-1",
                "Q-1", "ONLINE_BOOKED", "Đau răng", null, null, "CANCELLED",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(appointmentRepository.findById("app-1")).willReturn(Optional.of(cancelledApp));
        given(timeSlotRepository.findById("slot-1")).willReturn(Optional.of(slot));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(cancelledApp));
        given(timeSlotRepository.lockSlot("slot-1")).willReturn(false);

        assertThatThrownBy(() -> restoreService.restore(new RestoreAppointmentUseCase.Command("app-1")))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("Khung giờ này đã được bệnh nhân khác đặt sau khi bạn hủy");
    }
}
