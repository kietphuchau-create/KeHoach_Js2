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
    @DisplayName("Hai khách cùng chọn một giờ: chỉ yêu cầu khóa đầu tiên được đặt")
    void givenSlotWasJustTaken_whenAtomicLockFails_thenRejectSecondCustomer() {
        Instant start = nextWednesdayMorning(9, 0);
        Instant end = nextWednesdayMorning(9, 30);
        TimeSlot staleAvailableSlot = new TimeSlot("slot-race", "sch-1", start, end, "AVAILABLE", 0);

        given(timeSlotRepository.findById("slot-race")).willReturn(Optional.of(staleAvailableSlot));
        given(appointmentRepository.findByPatientProfileId("patient-2")).willReturn(List.of());
        // Khách đầu tiên đã đổi AVAILABLE -> BOOKED ngay trước câu lệnh CAS của khách thứ hai.
        given(timeSlotRepository.lockSlot("slot-race")).willReturn(false);

        BookAppointmentUseCase.Command secondCustomer = new BookAppointmentUseCase.Command(
                "center-1", "patient-2", "doc-1", "slot-race", "Đau bụng", ""
        );

        assertThatThrownBy(() -> bookService.book(secondCustomer))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("xung đột đồng thời");
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
                .hasMessageContaining("MED-111222")
                .hasMessageContaining("trùng giờ nhau");
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
    @DisplayName("Đặt lại lịch đã hủy: Bệnh nhân đã hủy ca khám trước đó -> Được phép đặt lại đúng slot này thành công")
    void givenPatientCancelledAppointmentOnSameSlot_whenBookAgain_thenSuccess() {
        Instant start = nextWednesdayMorning(10, 0);
        Instant end = nextWednesdayMorning(10, 30);
        TimeSlot slot = new TimeSlot("slot-same", "sch-1", start, end, "AVAILABLE", 0);

        Appointment cancelledApp = new Appointment(
                "app-cancelled", "MED-CANCELLED", "center-1", "patient-1", "doc-1", "slot-same",
                "APP-202", "ONLINE_BOOKED", "Đau dạ dày", null, null, "CANCELLED",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-same")).willReturn(Optional.of(slot));
        given(timeSlotRepository.lockSlot("slot-same")).willReturn(true);
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(cancelledApp));
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(inv -> inv.getArgument(0));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "center-1", "patient-1", "doc-1", "slot-same", "Đau dạ dày", ""
        );

        Appointment result = bookService.book(cmd);
        assertThat(result).isNotNull();
        assertThat(result.slotId()).isEqualTo("slot-same");
    }

    @Test
    @DisplayName("Cho phép ca khám khác ngày: Thứ Tư và Thứ Năm")
    void givenContiguousSlot_whenBook_thenSuccess() {
        Instant start = nextWednesdayMorning(9, 30).plus(1, java.time.temporal.ChronoUnit.DAYS);
        Instant end = nextWednesdayMorning(10, 0).plus(1, java.time.temporal.ChronoUnit.DAYS);
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

    @Test
    @DisplayName("Chống spam cùng bác sĩ: Đã có ca PENDING/CONFIRMED với cùng Bác sĩ trong ngày -> Chặn đặt thêm")
    void givenPatientHasActiveAppointmentWithSameDoctorOnSameDay_whenBookAgain_thenThrowSlotNotAvailableException() {
        Instant start = nextWednesdayMorning(14, 0);
        Instant end = nextWednesdayMorning(14, 30);
        TimeSlot newSlot = new TimeSlot("slot-afternoon", "sch-doc1", start, end, "AVAILABLE", 0);

        Instant morningStart = nextWednesdayMorning(8, 30);
        Instant morningEnd = nextWednesdayMorning(9, 0);
        TimeSlot morningSlot = new TimeSlot("slot-morning", "sch-doc1", morningStart, morningEnd, "BOOKED", 1);

        Appointment morningApp = new Appointment(
                "app-morning", "MED-888999", "center-1", "patient-1", "doc-1", "slot-morning",
                "APP-101", "ONLINE_BOOKED", "Khám da liễu", null, null, "CONFIRMED",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-afternoon")).willReturn(Optional.of(newSlot));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(morningApp));
        given(timeSlotRepository.findById("slot-morning")).willReturn(Optional.of(morningSlot));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "center-1", "patient-1", "doc-1", "slot-afternoon", "Tái khám chiều", ""
        );

        assertThatThrownBy(() -> bookService.book(cmd))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("Bạn đã có ca khám mã #MED-888999");
    }

    @Test
    @DisplayName("Sau khi khám xong (COMPLETED): Cho phép đặt tiếp Bác sĩ khác trong cùng ngày nếu không trùng khung giờ")
    void givenPatientCompletedAppointmentWithDoctor1_whenBookDifferentDoctorOnSameDay_thenSuccess() {
        Instant start = nextWednesdayMorning(15, 0);
        Instant end = nextWednesdayMorning(15, 30);
        TimeSlot secondSlot = new TimeSlot("slot-second", "sch-doc3", start, end, "AVAILABLE", 0);

        TimeSlot slot1 = new TimeSlot("s1", "sch-doc1", nextWednesdayMorning(8, 0), nextWednesdayMorning(8, 30), "BOOKED", 1);
        Appointment app1 = new Appointment("a1", "MED-001", "c1", "patient-1", "doc-1", "s1", "A-1", "ONLINE_BOOKED", "", null, null, "COMPLETED", false, 0, null, Instant.now(), Instant.now());

        given(timeSlotRepository.findById("slot-second")).willReturn(Optional.of(secondSlot));
        given(timeSlotRepository.lockSlot("slot-second")).willReturn(true);
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(app1));
        given(timeSlotRepository.findById("s1")).willReturn(Optional.of(slot1));
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(inv -> inv.getArgument(0));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "c1", "patient-1", "doc-3", "slot-second", "Khám chuyên khoa thứ 2", ""
        );

        Appointment result = bookService.book(cmd);
        assertThat(result).isNotNull();
        assertThat(result.slotId()).isEqualTo("slot-second");
        assertThat(result.doctorId()).isEqualTo("doc-3");
    }

    @Test
    @DisplayName("Sau khi khám xong (COMPLETED): Không được phép đặt lại cùng Bác sĩ đã khám trong ngày")
    void givenPatientCompletedAppointmentWithDoctor1_whenBookSameDoctorOnSameDay_thenThrowSlotNotAvailableException() {
        Instant start = nextWednesdayMorning(14, 0);
        Instant end = nextWednesdayMorning(14, 30);
        TimeSlot newSlot = new TimeSlot("slot-afternoon", "sch-doc1", start, end, "AVAILABLE", 0);

        Instant morningStart = nextWednesdayMorning(8, 30);
        Instant morningEnd = nextWednesdayMorning(9, 0);
        TimeSlot morningSlot = new TimeSlot("slot-morning", "sch-doc1", morningStart, morningEnd, "BOOKED", 1);

        Appointment morningApp = new Appointment(
                "app-morning", "MED-888999", "center-1", "patient-1", "doc-1", "slot-morning",
                "APP-101", "ONLINE_BOOKED", "Khám da liễu", null, null, "COMPLETED",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-afternoon")).willReturn(Optional.of(newSlot));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(morningApp));
        given(timeSlotRepository.findById("slot-morning")).willReturn(Optional.of(morningSlot));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "center-1", "patient-1", "doc-1", "slot-afternoon", "Tái khám chiều", ""
        );

        assertThatThrownBy(() -> bookService.book(cmd))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("đã hoàn tất ca khám mã #MED-888999 với Bác sĩ này trong ngày");
    }

    @Test
    @DisplayName("Giới hạn ca active bản thân: Khi ca cũ đang CONFIRMED/PENDING -> Không được đặt thêm ca thứ 2 cho bản thân dù khác bác sĩ")
    void givenPatientHasActiveAppointmentWithDoctor1_whenBookDifferentDoctor_thenThrowSlotNotAvailableException() {
        Instant start = nextWednesdayMorning(15, 0);
        Instant end = nextWednesdayMorning(15, 30);
        TimeSlot secondSlot = new TimeSlot("slot-second", "sch-doc3", start, end, "AVAILABLE", 0);

        TimeSlot slot1 = new TimeSlot("s1", "sch-doc1", nextWednesdayMorning(8, 0), nextWednesdayMorning(8, 30), "BOOKED", 1);
        Appointment app1 = new Appointment("a1", "MED-001", "c1", "patient-1", "doc-1", "s1", "A-1", "ONLINE_BOOKED", "", null, null, "CONFIRMED", false, 0, null, Instant.now(), Instant.now());

        given(timeSlotRepository.findById("slot-second")).willReturn(Optional.of(secondSlot));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(app1));
        given(timeSlotRepository.findById("s1")).willReturn(Optional.of(slot1));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "c1", "patient-1", "doc-3", "slot-second", "Khám chuyên khoa thứ 2", ""
        );

        assertThatThrownBy(() -> bookService.book(cmd))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("đang chờ phục vụ. Hệ thống giới hạn tối đa 1 ca chờ khám trong ngày");
    }

    @Test
    @DisplayName("Đặt cho Người Thân: Dù bản thân đã có 1 ca khám trong ngày -> Vẫn cho phép đặt lịch cho Người Thân")
    void givenPatientHasActiveSelfAppointmentOnSameDay_whenBookForRelative_thenSuccess() {
        Instant start = nextWednesdayMorning(14, 0);
        Instant end = nextWednesdayMorning(14, 30);
        TimeSlot relativeSlot = new TimeSlot("slot-rel", "sch-doc1", start, end, "AVAILABLE", 0);

        TimeSlot selfSlot = new TimeSlot("slot-self", "sch-doc1", nextWednesdayMorning(9, 0), nextWednesdayMorning(9, 30), "BOOKED", 1);
        Appointment selfApp = new Appointment(
                "app-self", "MED-111", "c1", "patient-1", "doc-1", "slot-self",
                "A-1", "ONLINE_BOOKED", "Bản thân đau đầu", null, null, "CONFIRMED",
                false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-rel")).willReturn(Optional.of(relativeSlot));
        given(timeSlotRepository.lockSlot("slot-rel")).willReturn(true);
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(selfApp));
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(inv -> inv.getArgument(0));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "c1", "patient-1", "doc-1", "slot-rel",
                "[Khám cho người thân: Nguyễn Văn Ba (1960) - Quan hệ: Ba - SĐT: 0912345678] Đau lưng", ""
        );

        Appointment result = bookService.book(cmd);
        assertThat(result).isNotNull();
        assertThat(result.slotId()).isEqualTo("slot-rel");
        assertThat(result.patientSymptoms()).contains("[Khám cho người thân: Nguyễn Văn Ba");
    }

    @Test
    @DisplayName("Đặt cho nhiều Người Thân khác nhau: Đã có ca khám cho Ba -> Vẫn cho phép đặt tiếp cho Mẹ trong cùng ngày")
    void givenPatientHasActiveRelativeAppointmentOnSameDay_whenBookForDifferentRelative_thenSuccess() {
        Instant start = nextWednesdayMorning(15, 0);
        Instant end = nextWednesdayMorning(15, 30);
        TimeSlot motherSlot = new TimeSlot("slot-mom", "sch-doc2", start, end, "AVAILABLE", 0);

        TimeSlot fatherSlot = new TimeSlot("slot-dad", "sch-doc1", nextWednesdayMorning(10, 0), nextWednesdayMorning(10, 30), "BOOKED", 1);
        Appointment fatherApp = new Appointment(
                "app-dad", "MED-222", "c1", "patient-1", "doc-1", "slot-dad",
                "A-2", "ONLINE_BOOKED",
                "[Khám cho người thân: Nguyễn Văn Ba (1960) - Quan hệ: Ba - SĐT: 0912345678] Khám tim",
                null, null, "CONFIRMED", false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-mom")).willReturn(Optional.of(motherSlot));
        given(timeSlotRepository.lockSlot("slot-mom")).willReturn(true);
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(fatherApp));
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(inv -> inv.getArgument(0));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "c1", "patient-1", "doc-2", "slot-mom",
                "[Khám cho người thân: Trần Thị Mẹ (1965) - Quan hệ: Mẹ - SĐT: 0987654321] Khám mắt", ""
        );

        Appointment result = bookService.book(cmd);
        assertThat(result).isNotNull();
        assertThat(result.slotId()).isEqualTo("slot-mom");
        assertThat(result.patientSymptoms()).contains("[Khám cho người thân: Trần Thị Mẹ");
    }

    @Test
    @DisplayName("Chống spam cho cùng một Người Thân: Đã có ca cho Ba -> Chặn đặt thêm ca thứ 2 cho chính người Ba đó")
    void givenPatientHasActiveRelativeAppointmentOnSameDay_whenBookAgainForSameRelative_thenThrowSlotNotAvailableException() {
        Instant start = nextWednesdayMorning(16, 0);
        Instant end = nextWednesdayMorning(16, 30);
        TimeSlot secondSlot = new TimeSlot("slot-dad-2", "sch-doc3", start, end, "AVAILABLE", 0);

        TimeSlot firstSlot = new TimeSlot("slot-dad-1", "sch-doc1", nextWednesdayMorning(10, 0), nextWednesdayMorning(10, 30), "BOOKED", 1);
        Appointment firstApp = new Appointment(
                "app-dad-1", "MED-333", "c1", "patient-1", "doc-1", "slot-dad-1",
                "A-3", "ONLINE_BOOKED",
                "[Khám cho người thân: Nguyễn Văn Ba (1960) - Quan hệ: Ba - SĐT: 0912345678] Khám tim",
                null, null, "CONFIRMED", false, 0, null, Instant.now(), Instant.now()
        );

        given(timeSlotRepository.findById("slot-dad-2")).willReturn(Optional.of(secondSlot));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(firstApp));
        given(timeSlotRepository.findById("slot-dad-1")).willReturn(Optional.of(firstSlot));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "c1", "patient-1", "doc-3", "slot-dad-2",
                "[Khám cho người thân: Nguyễn Văn Ba (1960) - Quan hệ: Ba - SĐT: 0912345678] Khám xương khớp", ""
        );

        assertThatThrownBy(() -> bookService.book(cmd))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("Người thân này đã có ca khám mã #MED-333");
    }
    @Test
    @DisplayName("Giới hạn Người Thân: Tối đa 2 ca active cho Người Thân trong ngày -> Ca thứ 3 bị chặn")
    void givenPatientHas2ActiveRelativeAppointments_whenBook3rdRelative_thenThrowSlotNotAvailableException() {
        Instant start = nextWednesdayMorning(17, 0);
        Instant end = nextWednesdayMorning(17, 30);
        TimeSlot slot3 = new TimeSlot("slot-child", "sch-doc4", start, end, "AVAILABLE", 0);

        TimeSlot slotDad = new TimeSlot("slot-dad", "sch-doc1", nextWednesdayMorning(9, 0), nextWednesdayMorning(9, 30), "BOOKED", 1);
        Appointment appDad = new Appointment("a-dad", "MED-D1", "c1", "patient-1", "doc-1", "slot-dad", "A-1", "ONLINE_BOOKED", "[Khám cho người thân: Ba (1960) - Quan hệ: Ba - SĐT: 091] Khám", null, null, "CONFIRMED", false, 0, null, Instant.now(), Instant.now());

        TimeSlot slotMom = new TimeSlot("slot-mom", "sch-doc2", nextWednesdayMorning(10, 0), nextWednesdayMorning(10, 30), "BOOKED", 1);
        Appointment appMom = new Appointment("a-mom", "MED-M1", "c1", "patient-1", "doc-2", "slot-mom", "A-2", "ONLINE_BOOKED", "[Khám cho người thân: Mẹ (1965) - Quan hệ: Mẹ - SĐT: 092] Khám", null, null, "CONFIRMED", false, 0, null, Instant.now(), Instant.now());

        given(timeSlotRepository.findById("slot-child")).willReturn(Optional.of(slot3));
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(appDad, appMom));
        given(timeSlotRepository.findById("slot-dad")).willReturn(Optional.of(slotDad));
        given(timeSlotRepository.findById("slot-mom")).willReturn(Optional.of(slotMom));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "c1", "patient-1", "doc-4", "slot-child", "[Khám cho người thân: Con (2010) - Quan hệ: Con - SĐT: 093] Khám", ""
        );

        assertThatThrownBy(() -> bookService.book(cmd))
                .isInstanceOf(SlotNotAvailableException.class)
                .hasMessageContaining("đã đạt tối đa 2 ca khám cho Người Thân");
    }

    @Test
    @DisplayName("Giới hạn Người Thân: Khi 1 ca Người Thân đã COMPLETED -> Cho phép đặt thêm ca Người Thân thứ 3")
    void givenPatientHas1CompletedAnd1ActiveRelative_whenBook3rdRelative_thenSuccess() {
        Instant start = nextWednesdayMorning(17, 0);
        Instant end = nextWednesdayMorning(17, 30);
        TimeSlot slot3 = new TimeSlot("slot-child", "sch-doc4", start, end, "AVAILABLE", 0);

        TimeSlot slotDad = new TimeSlot("slot-dad", "sch-doc1", nextWednesdayMorning(9, 0), nextWednesdayMorning(9, 30), "BOOKED", 1);
        Appointment appDad = new Appointment("a-dad", "MED-D1", "c1", "patient-1", "doc-1", "slot-dad", "A-1", "ONLINE_BOOKED", "[Khám cho người thân: Ba (1960) - Quan hệ: Ba - SĐT: 091] Khám", null, null, "COMPLETED", false, 0, null, Instant.now(), Instant.now());

        TimeSlot slotMom = new TimeSlot("slot-mom", "sch-doc2", nextWednesdayMorning(10, 0), nextWednesdayMorning(10, 30), "BOOKED", 1);
        Appointment appMom = new Appointment("a-mom", "MED-M1", "c1", "patient-1", "doc-2", "slot-mom", "A-2", "ONLINE_BOOKED", "[Khám cho người thân: Mẹ (1965) - Quan hệ: Mẹ - SĐT: 092] Khám", null, null, "CONFIRMED", false, 0, null, Instant.now(), Instant.now());

        given(timeSlotRepository.findById("slot-child")).willReturn(Optional.of(slot3));
        given(timeSlotRepository.lockSlot("slot-child")).willReturn(true);
        given(appointmentRepository.findByPatientProfileId("patient-1")).willReturn(List.of(appDad, appMom));
        given(timeSlotRepository.findById("slot-dad")).willReturn(Optional.of(slotDad));
        given(timeSlotRepository.findById("slot-mom")).willReturn(Optional.of(slotMom));
        given(appointmentRepository.save(any(Appointment.class))).willAnswer(inv -> inv.getArgument(0));

        BookAppointmentUseCase.Command cmd = new BookAppointmentUseCase.Command(
                "c1", "patient-1", "doc-4", "slot-child", "[Khám cho người thân: Con (2010) - Quan hệ: Con - SĐT: 093] Khám", ""
        );

        Appointment result = bookService.book(cmd);
        assertThat(result).isNotNull();
        assertThat(result.slotId()).isEqualTo("slot-child");
    }
}
