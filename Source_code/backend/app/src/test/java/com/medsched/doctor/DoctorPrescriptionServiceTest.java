package com.medsched.doctor;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.MedicalRecordEntity;
import com.medsched.persistence.entity.PrescriptionEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalRecordJpaRepository;
import com.medsched.persistence.repository.PrescriptionItemJpaRepository;
import com.medsched.persistence.repository.PrescriptionJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

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
                15,
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
}
