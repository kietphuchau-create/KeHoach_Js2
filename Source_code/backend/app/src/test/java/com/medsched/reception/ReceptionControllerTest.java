package com.medsched.reception;

import com.medsched.app.adapter.in.web.ReceptionController;
import com.medsched.billing.BillingService;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReceptionControllerTest {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private CheckinUseCase checkinUseCase;
    @Mock
    private BillingService billingService;
    @Mock
    private AppointmentJpaRepository appointmentJpaRepository;
    @Mock
    private PatientProfileJpaRepository patientProfileJpaRepository;
    @Mock
    private AppointmentRepositoryPort appointmentRepositoryPort;
    @Mock
    private UserJpaRepository userJpaRepository;
    @Mock
    private DoctorJpaRepository doctorJpaRepository;
    @Mock
    private TimeSlotJpaRepository timeSlotJpaRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ReceptionHistoryService receptionHistoryService;

    private ReceptionController receptionController;

    @BeforeEach
    void setUp() {
        receptionController = new ReceptionController(
                checkinUseCase, billingService, appointmentJpaRepository,
                patientProfileJpaRepository, appointmentRepositoryPort, userJpaRepository,
                doctorJpaRepository, timeSlotJpaRepository, passwordEncoder, receptionHistoryService
        );
    }

    @Test
    @DisplayName("CLAB-124: Tiếp đón QR thành công khi đúng ngày và trong khung giờ [-45m, +15m]")
    void checkinByQr_success_whenWithinWindow() {
        // Thứ Tư lúc 09:15
        ZonedDateTime nowTime = ZonedDateTime.of(2026, 10, 14, 9, 15, 0, 0, VN_ZONE);
        receptionController.setClock(Clock.fixed(nowTime.toInstant(), VN_ZONE));

        // Slot lúc 09:30 - 10:00 (trước 15 phút, trong giới hạn 45 phút)
        Instant slotStart = ZonedDateTime.of(2026, 10, 14, 9, 30, 0, 0, VN_ZONE).toInstant();
        Instant slotEnd = ZonedDateTime.of(2026, 10, 14, 10, 0, 0, 0, VN_ZONE).toInstant();
        TimeSlotEntity slot = new TimeSlotEntity("slot-1", "sch-1", "doc-1", slotStart, slotEnd, SlotStatus.BOOKED, slotStart, slotStart);

        AppointmentEntity app = new AppointmentEntity(
                "app-1", "MED123456", "mc-1", "pat-1", "doc-1", "slot-1",
                "A01", QueueType.ONLINE_BOOKED, "Đau đầu", AppointmentStatus.CONFIRMED,
                slotStart, slotStart
        );

        when(appointmentJpaRepository.findByBookingCode("MED123456")).thenReturn(Optional.of(app));
        when(timeSlotJpaRepository.findById("slot-1")).thenReturn(Optional.of(slot));
        when(appointmentJpaRepository.save(any(AppointmentEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<CheckinUseCase.CheckinResult> res =
                receptionController.checkinByQr(new ReceptionController.QrCheckinRequest("MED123456"));

        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(app.getStatus()).isEqualTo(AppointmentStatus.CHECKED_IN);
    }

    @Test
    @DisplayName("CLAB-124: Tiếp đón QR thất bại khi đến quá sớm (trước giờ khám hơn 45 phút)")
    void checkinByQr_throwsIllegalArg_whenTooEarly() {
        // Lúc 08:30
        ZonedDateTime nowTime = ZonedDateTime.of(2026, 10, 14, 8, 30, 0, 0, VN_ZONE);
        receptionController.setClock(Clock.fixed(nowTime.toInstant(), VN_ZONE));

        // Slot lúc 09:30 (sớm hơn 60 phút)
        Instant slotStart = ZonedDateTime.of(2026, 10, 14, 9, 30, 0, 0, VN_ZONE).toInstant();
        Instant slotEnd = ZonedDateTime.of(2026, 10, 14, 10, 0, 0, 0, VN_ZONE).toInstant();
        TimeSlotEntity slot = new TimeSlotEntity("slot-1", "sch-1", "doc-1", slotStart, slotEnd, SlotStatus.BOOKED, slotStart, slotStart);

        AppointmentEntity app = new AppointmentEntity(
                "app-1", "MED123456", "mc-1", "pat-1", "doc-1", "slot-1",
                "A01", QueueType.ONLINE_BOOKED, "Đau đầu", AppointmentStatus.CONFIRMED,
                slotStart, slotStart
        );

        when(appointmentJpaRepository.findByBookingCode("MED123456")).thenReturn(Optional.of(app));
        when(timeSlotJpaRepository.findById("slot-1")).thenReturn(Optional.of(slot));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                receptionController.checkinByQr(new ReceptionController.QrCheckinRequest("MED123456")));
        assertThat(ex.getMessage()).contains("Chưa đến giờ tiếp đón");
    }

    @Test
    @DisplayName("CLAB-124: Tiếp đón QR thất bại khi đến quá trễ (quá 15 phút sau giờ bắt đầu slot)")
    void checkinByQr_throwsIllegalArg_whenTooLate() {
        // Lúc 09:50
        ZonedDateTime nowTime = ZonedDateTime.of(2026, 10, 14, 9, 50, 0, 0, VN_ZONE);
        receptionController.setClock(Clock.fixed(nowTime.toInstant(), VN_ZONE));

        // Slot lúc 09:30 (đã quá 20 phút)
        Instant slotStart = ZonedDateTime.of(2026, 10, 14, 9, 30, 0, 0, VN_ZONE).toInstant();
        Instant slotEnd = ZonedDateTime.of(2026, 10, 14, 10, 0, 0, 0, VN_ZONE).toInstant();
        TimeSlotEntity slot = new TimeSlotEntity("slot-1", "sch-1", "doc-1", slotStart, slotEnd, SlotStatus.BOOKED, slotStart, slotStart);

        AppointmentEntity app = new AppointmentEntity(
                "app-1", "MED123456", "mc-1", "pat-1", "doc-1", "slot-1",
                "A01", QueueType.ONLINE_BOOKED, "Đau đầu", AppointmentStatus.CONFIRMED,
                slotStart, slotStart
        );

        when(appointmentJpaRepository.findByBookingCode("MED123456")).thenReturn(Optional.of(app));
        when(timeSlotJpaRepository.findById("slot-1")).thenReturn(Optional.of(slot));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                receptionController.checkinByQr(new ReceptionController.QrCheckinRequest("MED123456")));
        assertThat(ex.getMessage()).contains("Đã quá thời gian tiếp đón");
    }

    @Test
    @DisplayName("CLAB-124: Tiếp đón QR thất bại khi khác ngày hẹn khám")
    void checkinByQr_throwsIllegalArg_whenWrongDate() {
        // Hôm nay là 2026-10-14
        ZonedDateTime nowTime = ZonedDateTime.of(2026, 10, 14, 9, 0, 0, 0, VN_ZONE);
        receptionController.setClock(Clock.fixed(nowTime.toInstant(), VN_ZONE));

        // Slot vào ngày mai (2026-10-15)
        Instant slotStart = ZonedDateTime.of(2026, 10, 15, 9, 0, 0, 0, VN_ZONE).toInstant();
        Instant slotEnd = ZonedDateTime.of(2026, 10, 15, 9, 30, 0, 0, VN_ZONE).toInstant();
        TimeSlotEntity slot = new TimeSlotEntity("slot-1", "sch-1", "doc-1", slotStart, slotEnd, SlotStatus.BOOKED, slotStart, slotStart);

        AppointmentEntity app = new AppointmentEntity(
                "app-1", "MED123456", "mc-1", "pat-1", "doc-1", "slot-1",
                "A01", QueueType.ONLINE_BOOKED, "Đau đầu", AppointmentStatus.CONFIRMED,
                slotStart, slotStart
        );

        when(appointmentJpaRepository.findByBookingCode("MED123456")).thenReturn(Optional.of(app));
        when(timeSlotJpaRepository.findById("slot-1")).thenReturn(Optional.of(slot));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                receptionController.checkinByQr(new ReceptionController.QrCheckinRequest("MED123456")));
        assertThat(ex.getMessage()).contains("Chưa đến ngày khám");
    }

    @Test
    @DisplayName("CLAB-124: Tiếp nhận vãng lai tại quầy từ chối vào giờ nghỉ trưa (12:30)")
    void registerWalkin_throwsIllegalArg_duringLunchBreak() {
        ZonedDateTime lunchTime = ZonedDateTime.of(2026, 10, 14, 12, 30, 0, 0, VN_ZONE);
        receptionController.setClock(Clock.fixed(lunchTime.toInstant(), VN_ZONE));

        ReceptionController.WalkinRequest req = new ReceptionController.WalkinRequest(
                "Nguyễn Văn A", "0912345678", "079201008899", "doc-1", "Khoa Nội", "Pass123"
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                receptionController.registerWalkinPatient(req));
        assertThat(ex.getMessage()).contains("Hiện tại ngoài giờ làm việc của phòng khám");
    }

    @Test
    @DisplayName("CLAB-124: Tiếp nhận vãng lai tại quầy thành công trong giờ hành chính (09:15)")
    void registerWalkin_success_duringBusinessHours() {
        ZonedDateTime morningTime = ZonedDateTime.of(2026, 10, 14, 9, 15, 0, 0, VN_ZONE);
        receptionController.setClock(Clock.fixed(morningTime.toInstant(), VN_ZONE));

        DoctorEntity doctor = new DoctorEntity(
                "doc-1", "user-doc-1", "spec-1", "ThS.BS", new BigDecimal("300000"),
                "P.101", "Chuyên khoa Nội", null, morningTime.toInstant(), morningTime.toInstant()
        );
        UserEntity doctorUser = new UserEntity(
                "user-doc-1", "doc@medsched.vn", "hash", "Trần Bác Sĩ", "0901234567", true,
                morningTime.toInstant(), morningTime.toInstant()
        );

        when(doctorJpaRepository.findById("doc-1")).thenReturn(Optional.of(doctor));
        when(userJpaRepository.findById("user-doc-1")).thenReturn(Optional.of(doctorUser));
        when(userJpaRepository.findByPhone("0912345678")).thenReturn(Optional.empty());
        when(userJpaRepository.findByEmail("0912345678@medsched.vn")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encodedPassword");
        when(userJpaRepository.save(any(UserEntity.class))).thenAnswer(inv -> {
            UserEntity u = inv.getArgument(0);
            return u;
        });
        when(patientProfileJpaRepository.findByUserId(any())).thenReturn(List.of());
        when(patientProfileJpaRepository.save(any(PatientProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(appointmentJpaRepository.countByDoctorIdAndQueueTypeAndCreatedAtBetween(any(), any(), any(), any())).thenReturn(0L);
        when(appointmentJpaRepository.countByDoctorIdAndCreatedAtBetween(any(), any(), any())).thenReturn(5L);
        when(appointmentJpaRepository.save(any(AppointmentEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ReceptionController.WalkinRequest req = new ReceptionController.WalkinRequest(
                "Nguyễn Văn A", "0912345678", "079201008899", "doc-1", "Khoa Nội", "Pass123"
        );

        ResponseEntity<ReceptionController.WalkinResponse> res =
                receptionController.registerWalkinPatient(req);

        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().queueNumber()).isEqualTo("W-06");
    }
}
