package com.medsched.core.usecase;

import com.medsched.core.domain.exception.SlotNotAvailableException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.domain.model.TimeSlot;
import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BookAppointmentServiceTest {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private AppointmentRepositoryPort appointmentRepository;

    @Mock
    private TimeSlotRepositoryPort timeSlotRepository;

    @Mock
    private AiTriagePort aiTriagePort;

    private BookAppointmentService bookService;

    @BeforeEach
    void setUp() {
        bookService = new BookAppointmentService(appointmentRepository, timeSlotRepository, aiTriagePort);
    }

    /** Helper: lấy một ngày thứ Tư tuần tới (ngày làm việc trong tương lai) lúc 09:00 */
    private Instant nextWednesdayMorning(int hour, int minute) {
        LocalDate nextWednesday = LocalDate.now(VN_ZONE).with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY));
        return nextWednesday.atTime(LocalTime.of(hour, minute)).atZone(VN_ZONE).toInstant();
    }

    @Test
    @DisplayName("Đặt lịch thành công: Slot rảnh trong giờ hành chính và bệnh nhân chưa có lịch trùng")
    void givenAvailableSlot_whenBook_thenSuccess() {
        Instant start = nextWednesdayMorning(9, 0);
        Instant end = nextWednesdayMorning(9, 30);
        TimeSlot slot = new TimeSlot("slot-1", "sch-1", start, end, "AVAILABLE", 0);

        given(timeSlotRepository.findById("slot-1")).willReturn(Optional.of(slot));
        given(timeSlotRepository.lockSlot("slot-1")).willReturn(true);
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of());
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(inv -> inv.getArgument(0));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "center-1", "patient-1", "doc-1", "slot-1", "Đau họng", "Không có"
        );

        Appointment result = bookService.book(cmd);

        assertThat(result).isNotNull();
        assertThat(result.slotId()).isEqualTo("slot-1");
        assertThat(result.status()).isEqualTo("PENDING");
        verify(timeSlotRepository).lockSlot("slot-1");
    }

    @Test
    @DisplayName("Chặn Double-Booking: Bệnh nhân đã có lịch khám với Bác sĩ khác trùng khung giờ")
    void givenPatientHasOverlappingAppointment_whenBook_thenThrowSlotNotAvailableException() {
        Instant start = nextWednesdayMorning(9, 0);
        Instant end = nextWednesdayMorning(9, 30);
        TimeSlot newSlot = new TimeSlot("slot-2", "sch-2", start, end, "AVAILABLE", 0);

        // Ca khám cũ của bệnh nhân với Bác sĩ A ở khung giờ 09:15 - 09:45 (chồng lấn)
        Instant existingStart = nextWednesdayMorning(9, 15);
        Instant existingEnd = nextWednesdayMorning(9, 45);
        TimeSlot existingSlot = new TimeSlot("slot-old", "sch-old", existingStart, existingEnd, "BOOKED", 1);

        Appointment existingApp = new Appointment(
                "app-old", "MED-111222", "center-1", "patient-1", "doc-a", "slot-old",
                "APP-101", "ONLINE_BOOKED", "Khám tổng quát", null, null, "CONFIRMED",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-2")).willReturn(Optional.of(newSlot));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(existingApp));
        given(timeSlotRepository.findById("slot-old")).willReturn(Optional.of(existingSlot));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "center-1", "patient-1", "doc-b", "slot-2", "Khám da liễu", ""
        );

        assertThatThrownBy(() -> bookService.book(cmd))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("Bạn đã có lịch khám (Mã vé: MED-111222) trong cùng khung giờ này");
    }

    @Test
    @DisplayName("Chặn Double-Booking: Bệnh nhân bấm đặt lại chính xác cùng một slot_id")
    void givenPatientAlreadyBookedSameSlot_whenBookAgain_thenThrowSlotNotAvailableException() {
        Instant start = nextWednesdayMorning(10, 0);
        Instant end = nextWednesdayMorning(10, 30);
        TimeSlot slot = new TimeSlot("slot-same", "sch-1", start, end, "AVAILABLE", 0);

        Appointment existingApp = new Appointment(
                "app-exist", "MED-999888", "center-1", "patient-1", "doc-1", "slot-same",
                "APP-202", "ONLINE_BOOKED", "Đau dạ dày", null, null, "PENDING",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-same")).willReturn(Optional.of(slot));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(existingApp));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "center-1", "patient-1", "doc-1", "slot-same", "Đau dạ dày", ""
        );

        assertThatThrownBy(() -> bookService.book(cmd))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("Bạn đã có một lịch hẹn (Mã: MED-999888) tại đúng khung giờ này");
    }

    @Test
    @DisplayName("Cho phép ca khám liền kề (không chồng lấn): 09:00-09:30 và 09:30-10:00")
    void givenContiguousSlot_whenBook_thenSuccess() {
        Instant start = nextWednesdayMorning(9, 30);
        Instant end = nextWednesdayMorning(10, 0);
        TimeSlot newSlot = new TimeSlot("slot-contiguous", "sch-2", start, end, "AVAILABLE", 0);

        Instant existingStart = nextWednesdayMorning(9, 0);
        Instant existingEnd = nextWednesdayMorning(9, 30);
        TimeSlot existingSlot = new TimeSlot("slot-prior", "sch-1", existingStart, existingEnd, "BOOKED", 1);

        Appointment existingApp = new Appointment(
                "app-prior", "MED-333444", "center-1", "patient-1", "doc-a", "slot-prior",
                "APP-101", "ONLINE_BOOKED", "Nha khoa", null, null, "CONFIRMED",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-contiguous")).willReturn(Optional.of(newSlot));
        given(timeSlotRepository.lockSlot("slot-contiguous")).willReturn(true);
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(existingApp));
        given(timeSlotRepository.findById("slot-prior")).willReturn(Optional.of(existingSlot));
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(inv -> inv.getArgument(0));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "center-1", "patient-1", "doc-b", "slot-contiguous", "Mắt", ""
        );

        Appointment result = bookService.book(cmd);
        assertThat(result).isNotNull();
        assertThat(result.slotId()).isEqualTo("slot-contiguous");
    }
}
