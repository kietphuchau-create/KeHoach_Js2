package com.medsched.doctor;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.PrescriptionEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.Gender;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.PrescriptionJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrescriptionPdfServiceTest {

    @Mock
    private DoctorPrescriptionService doctorPrescriptionService;

    @Mock
    private AppointmentJpaRepository appointmentRepository;

    @Mock
    private PatientProfileJpaRepository patientProfileRepository;

    @Mock
    private PrescriptionJpaRepository prescriptionRepository;

    @InjectMocks
    private PrescriptionPdfService prescriptionPdfService;

    private AppointmentEntity mockAppointment;
    private PatientProfileEntity mockPatient;
    private DoctorPrescriptionDtos.PrescriptionDetailDto mockDetail;

    @BeforeEach
    void setUp() {
        mockAppointment = new AppointmentEntity(
                "apt-123",
                "BK-2026-999",
                "mc-1",
                "patient-456",
                "doc-789",
                "slot-1",
                "Q001",
                QueueType.ONLINE_BOOKED,
                "Sốt, ho kéo dài",
                AppointmentStatus.COMPLETED,
                Instant.now(),
                Instant.now()
        );

        mockPatient = new PatientProfileEntity(
                "patient-456",
                "user-1",
                RelationshipType.SELF,
                "Nguyễn Văn An",
                "079201008899",
                "DN4790123456789",
                LocalDate.of(1990, 5, 15),
                Gender.MALE,
                "0987654321",
                "Quận 1, TP. Hồ Chí Minh",
                "Không có tiền sử dị ứng",
                Instant.now(),
                Instant.now()
        );

        DoctorPrescriptionDtos.PrescriptionItemDetailDto item1 = new DoctorPrescriptionDtos.PrescriptionItemDetailDto(
                "item-1",
                "Paracetamol 500mg",
                "Viên",
                BigDecimal.valueOf(10),
                "Uống 1 viên sau ăn khi sốt trên 38.5 độ",
                BigDecimal.valueOf(2000),
                BigDecimal.valueOf(20000)
        );

        DoctorPrescriptionDtos.PrescriptionItemDetailDto item2 = new DoctorPrescriptionDtos.PrescriptionItemDetailDto(
                "item-2",
                "Vitamin C 500mg",
                "Viên",
                BigDecimal.valueOf(20),
                "Uống 1 viên mỗi sáng sau ăn",
                BigDecimal.valueOf(1500),
                BigDecimal.valueOf(30000)
        );

        mockDetail = new DoctorPrescriptionDtos.PrescriptionDetailDto(
                "RX-APT-123",
                "apt-123",
                "BS. CKI Nguyễn Văn Hoàng",
                "Viêm họng cấp tính",
                "Nghỉ ngơi, uống nhiều nước ấm, tránh đồ lạnh.",
                BigDecimal.valueOf(50000),
                "COMPLETED",
                Instant.now(),
                List.of(item1, item2)
        );
    }

    @Test
    @DisplayName("Xuất PDF thành công - Trả về mảng byte hợp lệ bắt đầu bằng %PDF-")
    void generatePrescriptionPdf_Success() {
        when(appointmentRepository.existsById("apt-123")).thenReturn(true);
        when(doctorPrescriptionService.getPrescriptionDetailsByAppointmentId("apt-123")).thenReturn(mockDetail);
        when(appointmentRepository.findById("apt-123")).thenReturn(Optional.of(mockAppointment));
        when(patientProfileRepository.findById("patient-456")).thenReturn(Optional.of(mockPatient));

        byte[] pdfBytes = prescriptionPdfService.generatePrescriptionPdf("apt-123");

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500, "File PDF phải có dung lượng lớn hơn 500 bytes");

        // Kiểm tra magic number chuẩn của định dạng PDF (%PDF-)
        String header = new String(pdfBytes, 0, 5);
        assertEquals("%PDF-", header, "Đầu file phải là chuẩn %PDF-");
    }

    @Test
    @DisplayName("Xuất PDF khi truyền vào prescriptionId - Tự động ánh xạ về appointmentId")
    void generatePrescriptionPdf_WhenPrescriptionIdProvided() {
        PrescriptionEntity rxEntity = new PrescriptionEntity(
                "rx-999",
                "apt-123",
                "mr-1",
                "doc-789",
                "BS. CKI Nguyễn Văn Hoàng",
                BigDecimal.valueOf(50000),
                "COMPLETED",
                Instant.now(),
                Instant.now()
        );

        when(appointmentRepository.existsById("rx-999")).thenReturn(false);
        when(prescriptionRepository.findById("rx-999")).thenReturn(Optional.of(rxEntity));
        when(doctorPrescriptionService.getPrescriptionDetailsByAppointmentId("apt-123")).thenReturn(mockDetail);
        when(appointmentRepository.findById("apt-123")).thenReturn(Optional.of(mockAppointment));
        when(patientProfileRepository.findById("patient-456")).thenReturn(Optional.of(mockPatient));

        byte[] pdfBytes = prescriptionPdfService.generatePrescriptionPdf("rx-999");

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500);
    }

    @Test
    @DisplayName("Xuất PDF khi không có bệnh nhân liên kết - Vẫn render thành công với giá trị mặc định")
    void generatePrescriptionPdf_WhenPatientProfileNull() {
        AppointmentEntity aptWithoutPatient = new AppointmentEntity(
                "apt-123",
                "BK-2026-999",
                "mc-1",
                null,
                "doc-789",
                "slot-1",
                "Q001",
                QueueType.ONLINE_BOOKED,
                "Sốt nhẹ",
                AppointmentStatus.COMPLETED,
                Instant.now(),
                Instant.now()
        );

        when(appointmentRepository.existsById("apt-123")).thenReturn(true);
        when(doctorPrescriptionService.getPrescriptionDetailsByAppointmentId("apt-123")).thenReturn(mockDetail);
        when(appointmentRepository.findById("apt-123")).thenReturn(Optional.of(aptWithoutPatient));

        byte[] pdfBytes = prescriptionPdfService.generatePrescriptionPdf("apt-123");

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500);
    }

    @Test
    @DisplayName("Ném ResourceNotFoundException khi không tìm thấy lịch hẹn")
    void generatePrescriptionPdf_WhenAppointmentNotFound() {
        when(appointmentRepository.existsById("apt-nonexistent")).thenReturn(true);
        when(doctorPrescriptionService.getPrescriptionDetailsByAppointmentId("apt-nonexistent")).thenReturn(mockDetail);
        when(appointmentRepository.findById("apt-nonexistent")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                prescriptionPdfService.generatePrescriptionPdf("apt-nonexistent"));
    }
}
