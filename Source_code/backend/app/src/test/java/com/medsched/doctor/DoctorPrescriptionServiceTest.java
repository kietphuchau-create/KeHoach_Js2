package com.medsched.doctor;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.MedicalRecordEntity;
import com.medsched.persistence.entity.PrescriptionEntity;
import com.medsched.persistence.entity.PrescriptionItemEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalRecordJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.PrescriptionItemJpaRepository;
import com.medsched.persistence.repository.PrescriptionJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import com.medsched.persistence.enums.SlotStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DoctorPrescriptionServiceTest {

    @Mock
    private AppointmentJpaRepository appointmentRepository;

    @Mock
    private MedicalRecordJpaRepository medicalRecordRepository;

    @Mock
    private PrescriptionItemJpaRepository prescriptionItemRepository;

    @Mock
    private PrescriptionJpaRepository prescriptionRepository;

    @Mock
    private DoctorJpaRepository doctorRepository;

    @Mock
    private UserJpaRepository userRepository;

    @Mock
    private PatientProfileJpaRepository patientProfileRepository;

    @Mock
    private TimeSlotJpaRepository timeSlotRepository;

    @InjectMocks
    private DoctorPrescriptionService doctorPrescriptionService;

    private AppointmentEntity sampleAppointment;
    private DoctorEntity sampleDoctor;
    private UserEntity sampleDoctorUser;

    @BeforeEach
    void setUp() {
        sampleAppointment = new AppointmentEntity(
                "ap000001-xxxx",
                "MED-748921",
                "mc-1",
                "patient-1",
                "doc-1",
                "slot-1",
                "A01",
                QueueType.ONLINE_BOOKED,
                "Sốt cao, đau họng",
                AppointmentStatus.CHECKED_IN,
                Instant.now(),
                Instant.now()
        );

        sampleDoctor = new DoctorEntity(
                "doc-1",
                "user-doc-1",
                "spec-1",
                "PGS.TS.BS",
                new BigDecimal("300000"),
                "101",
                "Chuyên gia đầu ngành Tai Mũi Họng",
                null,
                Instant.now(),
                Instant.now()
        );

        sampleDoctorUser = new UserEntity(
                "user-doc-1",
                "hung.tran@medsched.com",
                "hashed",
                "Trần Văn Hùng",
                "0987654321",
                true,
                Instant.now(),
                Instant.now()
        );
    }

    @Test
    @DisplayName("Bác sĩ kê đơn thành công: lưu bệnh án, lưu đơn thuốc và đổi ca khám sang COMPLETED")
    void completeConsultation_success() {
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));
        when(medicalRecordRepository.findByAppointmentId("ap000001-xxxx")).thenReturn(Optional.empty());
        when(medicalRecordRepository.save(any(MedicalRecordEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(doctorRepository.findById("doc-1")).thenReturn(Optional.of(sampleDoctor));
        when(userRepository.findById("user-doc-1")).thenReturn(Optional.of(sampleDoctorUser));
        when(prescriptionRepository.save(any(PrescriptionEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        DoctorPrescriptionDtos.CreatePrescriptionRequest request = new DoctorPrescriptionDtos.CreatePrescriptionRequest(
                "Viêm đường hô hấp trên thể nhẹ, viêm họng cấp",
                "Uống nhiều nước ấm, nghỉ ngơi, tái khám sau 5 ngày nếu sốt kéo dài",
                List.of(
                        new DoctorPrescriptionDtos.PrescriptionItemRequest(
                                "Paracetamol 500mg",
                                "Uống 1 viên sau ăn khi sốt trên 38.5 độ",
                                new BigDecimal("10"),
                                "Viên",
                                new BigDecimal("2000")
                        ),
                        new DoctorPrescriptionDtos.PrescriptionItemRequest(
                                "Vitamin C 500mg",
                                "Uống 1 viên vào mỗi buổi sáng",
                                new BigDecimal("10"),
                                "Viên",
                                new BigDecimal("1500")
                        )
                )
        );

        DoctorPrescriptionDtos.PrescriptionResponse response =
                doctorPrescriptionService.completeConsultation("ap000001-xxxx", request);

        assertThat(response).isNotNull();
        assertThat(response.appointmentId()).isEqualTo("ap000001-xxxx");
        assertThat(response.doctorName()).isEqualTo("PGS.TS.BS Trần Văn Hùng");
        assertThat(response.status()).isEqualTo("COMPLETED");
        // 10*2000 + 10*1500 = 20000 + 15000 = 35000
        assertThat(response.totalMedicineAmount()).isEqualByComparingTo("35000");

        // Kiểm tra ca khám đã cập nhật sang COMPLETED
        assertThat(sampleAppointment.getStatus()).isEqualTo(AppointmentStatus.COMPLETED);
        verify(appointmentRepository).save(sampleAppointment);
        verify(prescriptionItemRepository, times(2)).save(any());
        verify(prescriptionRepository).save(any());
    }

    @Test
    @DisplayName("Ném ResourceNotFoundException nếu không tìm thấy mã ca khám")
    void completeConsultation_throwsNotFound_whenAppointmentDoesNotExist() {
        when(appointmentRepository.findById("non-existent")).thenReturn(Optional.empty());

        DoctorPrescriptionDtos.CreatePrescriptionRequest request = new DoctorPrescriptionDtos.CreatePrescriptionRequest(
                "Sốt virus",
                "Nghỉ ngơi",
                List.of()
        );

        assertThrows(ResourceNotFoundException.class, () ->
                doctorPrescriptionService.completeConsultation("non-existent", request));
    }

    @Test
    @DisplayName("Ném IllegalArgumentException nếu ca khám đã bị CANCELLED")
    void completeConsultation_throwsIllegalState_whenCancelled() {
        sampleAppointment.setStatus(AppointmentStatus.CANCELLED);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));

        DoctorPrescriptionDtos.CreatePrescriptionRequest request = new DoctorPrescriptionDtos.CreatePrescriptionRequest(
                "Sốt virus",
                "Nghỉ ngơi",
                List.of()
        );

        assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.completeConsultation("ap000001-xxxx", request));
    }

    @Test
    @DisplayName("Lấy chi tiết đơn thuốc và hồ sơ bệnh án thành công")
    void getPrescriptionDetailsByAppointmentId_success() {
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));

        MedicalRecordEntity record = new MedicalRecordEntity(
                "mr000001",
                "ap000001-xxxx",
                "Viêm phế quản cấp",
                "Uống nhiều nước ấm",
                Instant.now(),
                Instant.now()
        );
        when(medicalRecordRepository.findByAppointmentId("ap000001-xxxx")).thenReturn(Optional.of(record));

        PrescriptionEntity prescription = new PrescriptionEntity(
                "pr000001",
                "ap000001-xxxx",
                "mr000001",
                "doc000001-xxxx",
                "BS. Nguyễn Văn A",
                new BigDecimal("50000"),
                "COMPLETED",
                Instant.now(),
                Instant.now()
        );
        when(prescriptionRepository.findByAppointmentId("ap000001-xxxx")).thenReturn(Optional.of(prescription));

        PrescriptionItemEntity item = new PrescriptionItemEntity(
                "item001",
                "mr000001",
                null,
                "Augmentin 1g",
                "Viên",
                "1 viên",
                "2 lần/ngày",
                5,
                new BigDecimal("10"),
                "Uống sau ăn no",
                Instant.now(),
                Instant.now()
        );
        item.setUnitPrice(new BigDecimal("5000"));
        when(prescriptionItemRepository.findByMedicalRecordId("mr000001")).thenReturn(List.of(item));

        DoctorPrescriptionDtos.PrescriptionDetailDto detail =
                doctorPrescriptionService.getPrescriptionDetailsByAppointmentId("ap000001-xxxx");

        assertThat(detail).isNotNull();
        assertThat(detail.prescriptionId()).isEqualTo("pr000001");
        assertThat(detail.diagnosis()).isEqualTo("Viêm phế quản cấp");
        assertThat(detail.doctorAdvice()).isEqualTo("Uống nhiều nước ấm");
        assertThat(detail.doctorName()).isEqualTo("BS. Nguyễn Văn A");
        assertThat(detail.items()).hasSize(1);
        assertThat(detail.items().get(0).medicineName()).isEqualTo("Augmentin 1g");
        assertThat(detail.items().get(0).totalPrice()).isEqualByComparingTo("50000");
    }

    @Test
    @DisplayName("CAB-71: Bác sĩ hoàn tất ca khám có kèm đơn thuốc")
    void completeVisit_success_withPrescription() {
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));
        when(medicalRecordRepository.findByAppointmentId("ap000001-xxxx")).thenReturn(Optional.empty());
        when(medicalRecordRepository.save(any(MedicalRecordEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(doctorRepository.findById("doc-1")).thenReturn(Optional.of(sampleDoctor));
        when(userRepository.findById("user-doc-1")).thenReturn(Optional.of(sampleDoctorUser));
        when(prescriptionRepository.save(any(PrescriptionEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        DoctorPrescriptionDtos.CompleteVisitRequest request = new DoctorPrescriptionDtos.CompleteVisitRequest(
                "Viêm họng đỏ cấp tính",
                "Tránh uống nước đá, giữ ấm cổ họng",
                List.of(
                        new DoctorPrescriptionDtos.PrescriptionItemRequest(
                                "Amoxicillin 500mg",
                                "1 viên x 2 lần/ngày sau ăn",
                                new BigDecimal("14"),
                                "Viên",
                                new BigDecimal("3000")
                        )
                )
        );

        DoctorPrescriptionDtos.CompleteVisitResponse response =
                doctorPrescriptionService.completeVisit("ap000001-xxxx", request);

        assertThat(response).isNotNull();
        assertThat(response.appointmentId()).isEqualTo("ap000001-xxxx");
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.diagnosis()).isEqualTo("Viêm họng đỏ cấp tính");
        assertThat(response.doctorAdvice()).isEqualTo("Tránh uống nước đá, giữ ấm cổ họng");
        assertThat(response.prescriptionId()).isNotNull();
        assertThat(response.totalMedicineAmount()).isEqualByComparingTo("42000");

        assertThat(sampleAppointment.getStatus()).isEqualTo(AppointmentStatus.COMPLETED);
        verify(appointmentRepository).save(sampleAppointment);
        verify(prescriptionRepository).save(any());
        verify(prescriptionItemRepository).save(any());
    }

    @Test
    @DisplayName("CAB-71: Bác sĩ hoàn tất ca khám không kê đơn thuốc (chỉ tư vấn/lời dặn)")
    void completeVisit_success_withoutPrescription() {
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));
        when(medicalRecordRepository.findByAppointmentId("ap000001-xxxx")).thenReturn(Optional.empty());
        when(medicalRecordRepository.save(any(MedicalRecordEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        DoctorPrescriptionDtos.CompleteVisitRequest request = new DoctorPrescriptionDtos.CompleteVisitRequest(
                "Cảm mạo nhẹ, sức khỏe tổng quát bình thường",
                "Ăn uống bồi bổ, uống nhiều nước, tập thể dục nhẹ",
                null
        );

        DoctorPrescriptionDtos.CompleteVisitResponse response =
                doctorPrescriptionService.completeVisit("ap000001-xxxx", request);

        assertThat(response).isNotNull();
        assertThat(response.appointmentId()).isEqualTo("ap000001-xxxx");
        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.diagnosis()).isEqualTo("Cảm mạo nhẹ, sức khỏe tổng quát bình thường");
        assertThat(response.prescriptionId()).isNull();
        assertThat(response.totalMedicineAmount()).isEqualByComparingTo(BigDecimal.ZERO);

        assertThat(sampleAppointment.getStatus()).isEqualTo(AppointmentStatus.COMPLETED);
        verify(appointmentRepository).save(sampleAppointment);
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("CAB-71: completeVisit ném ResourceNotFoundException nếu mã ca khám không tồn tại")
    void completeVisit_throwsNotFound() {
        when(appointmentRepository.findById("invalid-id")).thenReturn(Optional.empty());

        DoctorPrescriptionDtos.CompleteVisitRequest request = new DoctorPrescriptionDtos.CompleteVisitRequest(
                "Khám", "Lời dặn", null
        );

        assertThrows(ResourceNotFoundException.class, () ->
                doctorPrescriptionService.completeVisit("invalid-id", request));
    }

    @Test
    @DisplayName("CAB-71: completeVisit ném IllegalArgumentException nếu ca khám đã bị hủy")
    void completeVisit_throwsIllegalState_whenCancelled() {
        sampleAppointment.setStatus(AppointmentStatus.CANCELLED);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));

        DoctorPrescriptionDtos.CompleteVisitRequest request = new DoctorPrescriptionDtos.CompleteVisitRequest(
                "Khám", "Lời dặn", null
        );

        assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.completeVisit("ap000001-xxxx", request));
    }

    @Test
    @DisplayName("CLAB-124: callPatientToRoom thành công khi bệnh nhân CHECKED_IN, trong giờ khám và đúng slot")
    void callPatientToRoom_success_whenCheckedIn_andWithinWindow() {
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime nowTime = ZonedDateTime.of(2026, 10, 14, 9, 15, 0, 0, vnZone); // Thứ Tư lúc 09:15
        Clock fixedClock = Clock.fixed(nowTime.toInstant(), vnZone);
        doctorPrescriptionService.setClock(fixedClock);

        Instant slotStart = ZonedDateTime.of(2026, 10, 14, 9, 30, 0, 0, vnZone).toInstant();
        Instant slotEnd = ZonedDateTime.of(2026, 10, 14, 10, 0, 0, 0, vnZone).toInstant();
        TimeSlotEntity slot = new TimeSlotEntity("slot-1", "sch-1", "doc-1", slotStart, slotEnd, SlotStatus.BOOKED, slotStart, slotStart);

        sampleAppointment.setStatus(AppointmentStatus.CHECKED_IN);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));
        when(timeSlotRepository.findById("slot-1")).thenReturn(Optional.of(slot));
        when(appointmentRepository.findByDoctorIdAndStatus("doc-1", AppointmentStatus.IN_PROGRESS)).thenReturn(List.of());

        doctorPrescriptionService.callPatientToRoom("ap000001-xxxx");

        assertThat(sampleAppointment.getStatus()).isEqualTo(AppointmentStatus.IN_PROGRESS);
        verify(appointmentRepository).save(sampleAppointment);
    }

    @Test
    @DisplayName("CLAB-124: callPatientToRoom từ chối gọi bệnh nhân chưa check-in (CONFIRMED)")
    void callPatientToRoom_throwsIllegalArg_whenNotCheckedIn() {
        sampleAppointment.setStatus(AppointmentStatus.CONFIRMED);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.callPatientToRoom("ap000001-xxxx"));
        assertThat(ex.getMessage()).contains("chưa làm thủ tục tiếp đón");
    }

    @Test
    @DisplayName("CLAB-124: callPatientToRoom từ chối gọi vào giờ nghỉ trưa (12:30)")
    void callPatientToRoom_throwsIllegalArg_duringLunchBreak() {
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime lunchTime = ZonedDateTime.of(2026, 10, 14, 12, 30, 0, 0, vnZone);
        doctorPrescriptionService.setClock(Clock.fixed(lunchTime.toInstant(), vnZone));

        sampleAppointment.setStatus(AppointmentStatus.CHECKED_IN);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.callPatientToRoom("ap000001-xxxx"));
        assertThat(ex.getMessage()).contains("Ngoài giờ làm việc");
    }

    @Test
    @DisplayName("CLAB-124: callPatientToRoom từ chối gọi sớm hơn 30 phút trước giờ bắt đầu slot")
    void callPatientToRoom_throwsIllegalArg_whenTooEarly() {
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime earlyTime = ZonedDateTime.of(2026, 10, 14, 8, 30, 0, 0, vnZone); // 08:30
        doctorPrescriptionService.setClock(Clock.fixed(earlyTime.toInstant(), vnZone));

        // Slot bắt đầu lúc 09:30 (sớm hơn 60 phút)
        Instant slotStart = ZonedDateTime.of(2026, 10, 14, 9, 30, 0, 0, vnZone).toInstant();
        Instant slotEnd = ZonedDateTime.of(2026, 10, 14, 10, 0, 0, 0, vnZone).toInstant();
        TimeSlotEntity slot = new TimeSlotEntity("slot-1", "sch-1", "doc-1", slotStart, slotEnd, SlotStatus.BOOKED, slotStart, slotStart);

        sampleAppointment.setStatus(AppointmentStatus.CHECKED_IN);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));
        when(timeSlotRepository.findById("slot-1")).thenReturn(Optional.of(slot));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.callPatientToRoom("ap000001-xxxx"));
        assertThat(ex.getMessage()).contains("tối đa 30 phút");
    }

    @Test
    @DisplayName("CLAB-124: callPatientToRoom từ chối gọi ca khám không thuộc ngày hôm nay")
    void callPatientToRoom_throwsIllegalArg_whenWrongDate() {
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime todayTime = ZonedDateTime.of(2026, 10, 14, 9, 0, 0, 0, vnZone); // Thứ Tư
        doctorPrescriptionService.setClock(Clock.fixed(todayTime.toInstant(), vnZone));

        // Slot vào ngày mai (2026-10-15)
        Instant slotStart = ZonedDateTime.of(2026, 10, 15, 9, 0, 0, 0, vnZone).toInstant();
        Instant slotEnd = ZonedDateTime.of(2026, 10, 15, 9, 30, 0, 0, vnZone).toInstant();
        TimeSlotEntity slot = new TimeSlotEntity("slot-1", "sch-1", "doc-1", slotStart, slotEnd, SlotStatus.BOOKED, slotStart, slotStart);

        sampleAppointment.setStatus(AppointmentStatus.CHECKED_IN);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));
        when(timeSlotRepository.findById("slot-1")).thenReturn(Optional.of(slot));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.callPatientToRoom("ap000001-xxxx"));
        assertThat(ex.getMessage()).contains("không phải ngày hôm nay");
    }

    @Test
    @DisplayName("completeConsultation từ chối ca khám chưa check-in (CONFIRMED)")
    void completeConsultation_throwsIllegalArg_whenNotCheckedIn() {
        sampleAppointment.setStatus(AppointmentStatus.CONFIRMED);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));

        DoctorPrescriptionDtos.CreatePrescriptionRequest request = new DoctorPrescriptionDtos.CreatePrescriptionRequest(
                "Chẩn đoán", "Lời dặn", List.of()
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.completeConsultation("ap000001-xxxx", request));
        assertThat(ex.getMessage()).contains("Bệnh nhân chưa làm thủ tục tiếp đón tại sảnh chờ");
    }

    @Test
    @DisplayName("completeConsultation từ chối ca khám đã COMPLETED trước đó")
    void completeConsultation_throwsIllegalArg_whenAlreadyCompleted() {
        sampleAppointment.setStatus(AppointmentStatus.COMPLETED);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));

        DoctorPrescriptionDtos.CreatePrescriptionRequest request = new DoctorPrescriptionDtos.CreatePrescriptionRequest(
                "Chẩn đoán", "Lời dặn", List.of()
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.completeConsultation("ap000001-xxxx", request));
        assertThat(ex.getMessage()).contains("Ca khám đã hoàn tất trước đó");
    }

    @Test
    @DisplayName("completeConsultation từ chối khi số lượng thuốc <= 0")
    void completeConsultation_throwsIllegalArg_whenMedicineQuantityInvalid() {
        sampleAppointment.setStatus(AppointmentStatus.CHECKED_IN);
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));
        when(medicalRecordRepository.findByAppointmentId("ap000001-xxxx")).thenReturn(Optional.empty());
        when(medicalRecordRepository.save(any(MedicalRecordEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        DoctorPrescriptionDtos.CreatePrescriptionRequest request = new DoctorPrescriptionDtos.CreatePrescriptionRequest(
                "Chẩn đoán", "Lời dặn", List.of(
                        new DoctorPrescriptionDtos.PrescriptionItemRequest(
                                "Paracetamol", "1 viên", BigDecimal.ZERO, "Viên", new BigDecimal("5000")
                        )
                )
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                doctorPrescriptionService.completeConsultation("ap000001-xxxx", request));
        assertThat(ex.getMessage()).contains("Số lượng thuốc kê đơn phải lớn hơn 0");
    }
}

