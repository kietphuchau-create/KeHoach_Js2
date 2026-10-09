package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.CancelAppointmentUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CancelAppointmentServiceTest {

    @Mock
    private AppointmentRepositoryPort appointmentRepository;

    @Mock
    private TimeSlotRepositoryPort timeSlotRepository;

    private CancelAppointmentService cancelService;

    @BeforeEach
    void setUp() {
        cancelService = new CancelAppointmentService(appointmentRepository, timeSlotRepository);
    }

    @Test
    @DisplayName("CLAB-105: Hủy ca khám CONFIRMED thành công -> Đổi status CANCELLED và giải phóng slot về AVAILABLE")
    void givenConfirmedAppointment_whenCancel_thenStatusIsCancelledAndSlotReleased() {
        Appointment appointment = new Appointment(
                "app-1", "MED-748921", "center-1", "patient-1", "doc-1", "slot-100",
                "APP-101", "ONLINE_BOOKED", "Sốt ho", null, null, "CONFIRMED",
                false, 0, null, Instant.now(), Instant.now()
        );
        given(appointmentRepository.findById("app-1")).willReturn(Optional.of(appointment));
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(invocation -> invocation.getArgument(0));

        Appointment result = cancelService.cancel(new CancelAppointmentUseCase.Command("app-1", "Bận việc đột xuất"));

        assertThat(result.status()).isEqualTo("CANCELLED");
        verify(timeSlotRepository).releaseSlot("slot-100");

        ArgumentCaptor<Appointment> captor = ArgumentCaptor.forClass(Appointment.class);
        verify(appointmentRepository).save(captor.capture());
        assertThat(captor.getValue().status()).isEqualTo("CANCELLED");
    }

    @Test
    @DisplayName("CLAB-105: Ca khám không tồn tại -> Báo lỗi 404 ResourceNotFoundException")
    void givenNonExistentAppointment_whenCancel_thenThrowsResourceNotFoundException() {
        given(appointmentRepository.findById("unknown-id")).willReturn(Optional.empty());

        assertThatThrownBy(() -> cancelService.cancel(new CancelAppointmentUseCase.Command("unknown-id", "Bận việc")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy ca khám: unknown-id");

        verify(timeSlotRepository, never()).releaseSlot(any());
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("CLAB-105: Ca khám đã CHECKED_IN -> Không cho phép hủy, ném lỗi IllegalArgumentException")
    void givenCheckedInAppointment_whenCancel_thenThrowsIllegalArgumentException() {
        Appointment appointment = new Appointment(
                "app-1", "MED-748921", "center-1", "patient-1", "doc-1", "slot-100",
                "APP-101", "ONLINE_BOOKED", "Sốt ho", null, "QR_CODE", "CHECKED_IN",
                false, 0, Instant.now(), Instant.now(), Instant.now()
        );
        given(appointmentRepository.findById("app-1")).willReturn(Optional.of(appointment));

        assertThatThrownBy(() -> cancelService.cancel(new CancelAppointmentUseCase.Command("app-1", "Bận việc")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ca khám đã tiếp đón tại quầy hoặc đã hoàn tất, không thể hủy.");

        verify(timeSlotRepository, never()).releaseSlot(any());
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("CLAB-105: Ca khám đã COMPLETED -> Không cho phép hủy, ném lỗi IllegalArgumentException")
    void givenCompletedAppointment_whenCancel_thenThrowsIllegalArgumentException() {
        Appointment appointment = new Appointment(
                "app-1", "MED-748921", "center-1", "patient-1", "doc-1", "slot-100",
                "APP-101", "ONLINE_BOOKED", "Sốt ho", null, "QR_CODE", "COMPLETED",
                false, 0, Instant.now(), Instant.now(), Instant.now()
        );
        given(appointmentRepository.findById("app-1")).willReturn(Optional.of(appointment));

        assertThatThrownBy(() -> cancelService.cancel(new CancelAppointmentUseCase.Command("app-1", "Bận việc")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ca khám đã tiếp đón tại quầy hoặc đã hoàn tất, không thể hủy.");

        verify(timeSlotRepository, never()).releaseSlot(any());
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("CLAB-105: Ca khám đã CANCELLED trước đó -> Trả về kết quả an toàn (Idempotent)")
    void givenAlreadyCancelledAppointment_whenCancel_thenReturnsGracefully() {
        Appointment appointment = new Appointment(
                "app-1", "MED-748921", "center-1", "patient-1", "doc-1", "slot-100",
                "APP-101", "ONLINE_BOOKED", "Sốt ho", null, null, "CANCELLED",
                false, 0, null, Instant.now(), Instant.now()
        );
        given(appointmentRepository.findById("app-1")).willReturn(Optional.of(appointment));

        Appointment result = cancelService.cancel(new CancelAppointmentUseCase.Command("app-1", "Bận việc"));

        assertThat(result.status()).isEqualTo("CANCELLED");
        verify(appointmentRepository, never()).save(any());
    }

}
