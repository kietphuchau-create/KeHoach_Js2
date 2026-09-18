package com.medsched.billing;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.InvoiceEntity;
import com.medsched.persistence.entity.MedicalRecordEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.PaymentEntity;
import com.medsched.persistence.entity.PrescriptionItemEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.PaymentMethod;
import com.medsched.persistence.enums.PaymentStatus;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.InvoiceJpaRepository;
import com.medsched.persistence.repository.MedicalRecordJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.PaymentJpaRepository;
import com.medsched.persistence.repository.PrescriptionItemJpaRepository;
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
class BillingServiceTest {

    @Mock
    private AppointmentJpaRepository appointmentRepository;

    @Mock
    private DoctorJpaRepository doctorRepository;

    @Mock
    private UserJpaRepository userRepository;

    @Mock
    private PatientProfileJpaRepository patientProfileRepository;

    @Mock
    private MedicalRecordJpaRepository medicalRecordRepository;

    @Mock
    private PrescriptionItemJpaRepository prescriptionItemRepository;

    @Mock
    private InvoiceJpaRepository invoiceRepository;

    @Mock
    private PaymentJpaRepository paymentRepository;

    @InjectMocks
    private BillingService billingService;

    private AppointmentEntity sampleAppointment;
    private DoctorEntity sampleDoctor;
    private UserEntity sampleDoctorUser;
    private PatientProfileEntity samplePatient;
    private MedicalRecordEntity sampleMedicalRecord;
    private List<PrescriptionItemEntity> sampleItems;
    private InvoiceEntity sampleInvoice;

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
                AppointmentStatus.COMPLETED,
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
                "Chuyên gia đầu ngành",
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

        samplePatient = new PatientProfileEntity(
                "patient-1",
                "user-patient-1",
                null,
                "Nguyễn Văn A",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Instant.now(),
                Instant.now()
        );

        sampleMedicalRecord = new MedicalRecordEntity(
                "rec-1",
                "ap000001-xxxx",
                "Viêm họng cấp",
                "Nghỉ ngơi",
                Instant.now(),
                Instant.now()
        );

        PrescriptionItemEntity item1 = new PrescriptionItemEntity(
                "item-1",
                "rec-1",
                null,
                "Paracetamol 500mg",
                "Viên",
                "1 viên sau ăn",
                "1 viên sau ăn",
                5,
                new BigDecimal("10"),
                "1 viên sau ăn",
                Instant.now(),
                Instant.now()
        );
        item1.setUnitPrice(new BigDecimal("2000"));

        PrescriptionItemEntity item2 = new PrescriptionItemEntity(
                "item-2",
                "rec-1",
                null,
                "Vitamin C 500mg",
                "Viên",
                "1 viên sáng",
                "1 viên sáng",
                5,
                new BigDecimal("10"),
                "1 viên sáng",
                Instant.now(),
                Instant.now()
        );
        item2.setUnitPrice(new BigDecimal("1500"));

        sampleItems = List.of(item1, item2);

        sampleInvoice = new InvoiceEntity(
                "inv-12345",
                "HD-123456",
                "ap000001-xxxx",
                "patient-1",
                "doc-1",
                new BigDecimal("300000"),
                new BigDecimal("35000"),
                new BigDecimal("335000"),
                BigDecimal.ZERO,
                "PENDING",
                Instant.now(),
                Instant.now()
        );
    }

    @Test
    @DisplayName("Lấy chi tiết hóa đơn: tiền khám 300k + tiền thuốc 35k = tổng 335k")
    void getBillDetail_success() {
        when(appointmentRepository.findById("ap000001-xxxx")).thenReturn(Optional.of(sampleAppointment));
        when(patientProfileRepository.findById("patient-1")).thenReturn(Optional.of(samplePatient));
        when(doctorRepository.findById("doc-1")).thenReturn(Optional.of(sampleDoctor));
        when(userRepository.findById("user-doc-1")).thenReturn(Optional.of(sampleDoctorUser));
        when(medicalRecordRepository.findByAppointmentId("ap000001-xxxx")).thenReturn(Optional.of(sampleMedicalRecord));
        when(prescriptionItemRepository.findByMedicalRecordId("rec-1")).thenReturn(sampleItems);
        when(invoiceRepository.findByAppointmentId("ap000001-xxxx")).thenReturn(Optional.of(sampleInvoice));

        BillingDtos.BillDetailResponse response = billingService.getBillDetail("ap000001-xxxx");

        assertThat(response).isNotNull();
        assertThat(response.appointmentId()).isEqualTo("ap000001-xxxx");
        assertThat(response.patientName()).isEqualTo("Nguyễn Văn A");
        assertThat(response.doctorName()).isEqualTo("PGS.TS.BS Trần Văn Hùng");
        assertThat(response.consultationFee()).isEqualByComparingTo("300000");
        assertThat(response.medicineAmount()).isEqualByComparingTo("35000");
        assertThat(response.totalAmount()).isEqualByComparingTo("335000");
        assertThat(response.items()).hasSize(2);
    }

    @Test
    @DisplayName("Thanh toán hóa đơn thành công: cập nhật status PAID và ghi nhận vào bảng payments")
    void payInvoice_success() {
        when(invoiceRepository.findById("inv-12345")).thenReturn(Optional.of(sampleInvoice));
        when(paymentRepository.save(any(PaymentEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        BillingDtos.PayInvoiceRequest request = new BillingDtos.PayInvoiceRequest(
                "CASH",
                new BigDecimal("335000"),
                "Thu tiền mặt tại quầy Q1"
        );

        BillingDtos.PayInvoiceResponse response = billingService.payInvoice("inv-12345", request);

        assertThat(response).isNotNull();
        assertThat(response.invoiceId()).isEqualTo("inv-12345");
        assertThat(response.status()).isEqualTo("PAID");
        assertThat(response.amountPaid()).isEqualByComparingTo("335000");
        assertThat(response.paymentMethod()).isEqualTo("CASH");
        assertThat(response.transactionRef()).isNotNull();

        assertThat(sampleInvoice.getStatus()).isEqualTo("PAID");
        assertThat(sampleInvoice.getAmountPaid()).isEqualByComparingTo("335000");
        verify(invoiceRepository).save(sampleInvoice);
        verify(paymentRepository).save(any(PaymentEntity.class));
    }

    @Test
    @DisplayName("Ném IllegalArgumentException nếu hóa đơn đã được thanh toán trước đó")
    void payInvoice_throwsIllegalState_whenAlreadyPaid() {
        sampleInvoice.setStatus("PAID");
        when(invoiceRepository.findById("inv-12345")).thenReturn(Optional.of(sampleInvoice));

        BillingDtos.PayInvoiceRequest request = new BillingDtos.PayInvoiceRequest(
                "CASH",
                new BigDecimal("335000"),
                "Thu tiền mặt"
        );

        assertThrows(IllegalArgumentException.class, () ->
                billingService.payInvoice("inv-12345", request));
    }

    @Test
    @DisplayName("Ném ResourceNotFoundException nếu không tìm thấy hóa đơn")
    void payInvoice_throwsNotFound_whenInvoiceDoesNotExist() {
        when(invoiceRepository.findById("inv-not-found")).thenReturn(Optional.empty());

        BillingDtos.PayInvoiceRequest request = new BillingDtos.PayInvoiceRequest(
                "CASH",
                new BigDecimal("335000"),
                "Thu tiền mặt"
        );

        assertThrows(ResourceNotFoundException.class, () ->
                billingService.payInvoice("inv-not-found", request));
    }
}
