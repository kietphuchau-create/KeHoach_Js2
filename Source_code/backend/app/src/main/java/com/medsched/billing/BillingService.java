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
import com.medsched.persistence.enums.PaymentMethod;
import com.medsched.persistence.enums.PaymentStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.InvoiceJpaRepository;
import com.medsched.persistence.repository.MedicalRecordJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.PaymentJpaRepository;
import com.medsched.persistence.repository.PrescriptionItemJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BillingService {

    private final AppointmentJpaRepository appointmentRepository;
    private final DoctorJpaRepository doctorRepository;
    private final UserJpaRepository userRepository;
    private final PatientProfileJpaRepository patientProfileRepository;
    private final MedicalRecordJpaRepository medicalRecordRepository;
    private final PrescriptionItemJpaRepository prescriptionItemRepository;
    private final InvoiceJpaRepository invoiceRepository;
    private final PaymentJpaRepository paymentRepository;

    public BillingService(AppointmentJpaRepository appointmentRepository,
                          DoctorJpaRepository doctorRepository,
                          UserJpaRepository userRepository,
                          PatientProfileJpaRepository patientProfileRepository,
                          MedicalRecordJpaRepository medicalRecordRepository,
                          PrescriptionItemJpaRepository prescriptionItemRepository,
                          InvoiceJpaRepository invoiceRepository,
                          PaymentJpaRepository paymentRepository) {
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
    }

    /**
     * CLAB-108: Lấy chi tiết hóa đơn (Tiền khám bác sĩ + Tiền thuốc).
     */
    @Transactional
    public BillingDtos.BillDetailResponse getBillDetail(String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));

        // 1. Tên bệnh nhân
        String patientName = "Bệnh nhân";
        if (appointment.getPatientProfileId() != null) {
            Optional<PatientProfileEntity> patientOpt = patientProfileRepository.findById(appointment.getPatientProfileId());
            if (patientOpt.isPresent()) {
                patientName = patientOpt.get().getFullName();
            }
        }

        // 2. Tiền khám & tên bác sĩ
        BigDecimal consultationFee = BigDecimal.ZERO;
        String doctorName = "Bác sĩ khám";
        if (appointment.getDoctorId() != null) {
            Optional<DoctorEntity> docOpt = doctorRepository.findById(appointment.getDoctorId());
            if (docOpt.isPresent()) {
                DoctorEntity doc = docOpt.get();
                consultationFee = doc.getConsultationFee() != null ? doc.getConsultationFee() : BigDecimal.ZERO;
                Optional<UserEntity> userOpt = userRepository.findById(doc.getUserId());
                if (userOpt.isPresent()) {
                    String prefix = doc.getAcademicTitle() != null ? doc.getAcademicTitle() + " " : "BS. ";
                    doctorName = prefix + userOpt.get().getFullName();
                }
            }
        }

        // 3. Danh sách thuốc trong đơn & tiền thuốc
        BigDecimal medicineAmount = BigDecimal.ZERO;
        List<BillingDtos.BillItemDto> itemDtos = new ArrayList<>();
        Optional<MedicalRecordEntity> recordOpt = medicalRecordRepository.findByAppointmentId(appointmentId);
        if (recordOpt.isPresent()) {
            List<PrescriptionItemEntity> items = prescriptionItemRepository.findByMedicalRecordId(recordOpt.get().getId());
            for (PrescriptionItemEntity item : items) {
                BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ONE;
                BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal lineAmount = qty.multiply(unitPrice);
                medicineAmount = medicineAmount.add(lineAmount);

                itemDtos.add(new BillingDtos.BillItemDto(
                        item.getMedicineName(),
                        qty,
                        item.getUnit(),
                        unitPrice,
                        lineAmount
                ));
            }
        }

        BigDecimal totalAmount = consultationFee.add(medicineAmount);

        final BigDecimal finalConsultationFee = consultationFee;
        final BigDecimal finalMedicineAmount = medicineAmount;
        final BigDecimal finalTotalAmount = totalAmount;

        // 4. Tìm hoặc khởi tạo InvoiceEntity
        InvoiceEntity invoice = invoiceRepository.findByAppointmentId(appointmentId)
                .orElseGet(() -> {
                    String invId = "inv" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
                    String invNum = "HD-" + (int) (Math.random() * 900000 + 100000);
                    InvoiceEntity newInv = new InvoiceEntity(
                            invId,
                            invNum,
                            appointmentId,
                            appointment.getPatientProfileId(),
                            appointment.getDoctorId(),
                            finalConsultationFee,
                            finalMedicineAmount,
                            finalTotalAmount,
                            BigDecimal.ZERO,
                            "PENDING",
                            Instant.now(),
                            Instant.now()
                    );
                    return invoiceRepository.save(newInv);
                });

        return new BillingDtos.BillDetailResponse(
                appointment.getId(),
                appointment.getBookingCode(),
                patientName,
                doctorName,
                consultationFee,
                medicineAmount,
                totalAmount,
                invoice.getStatus(),
                invoice.getId(),
                itemDtos
        );
    }

    /**
     * CLAB-108: Xác nhận thanh toán hóa đơn viện phí tại quầy lễ tân.
     */
    @Transactional
    public BillingDtos.PayInvoiceResponse payInvoice(String invoiceId, BillingDtos.PayInvoiceRequest request) {
        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn: " + invoiceId));

        if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
            throw new IllegalArgumentException("Hóa đơn này đã được thanh toán trước đó.");
        }

        PaymentMethod method;
        try {
            method = (request.paymentMethod() != null && !request.paymentMethod().isBlank())
                    ? PaymentMethod.valueOf(request.paymentMethod().toUpperCase().trim())
                    : PaymentMethod.CASH;
        } catch (IllegalArgumentException e) {
            method = PaymentMethod.CASH;
        }

        String transactionRef = "TX-" + System.currentTimeMillis() + "-" + (int) (Math.random() * 9000 + 1000);

        // 1. Ghi nhận giao dịch vào bảng payments
        PaymentEntity payment = new PaymentEntity(
                UUID.randomUUID().toString(),
                invoice.getAppointmentId(),
                request.amountPaid(),
                method,
                PaymentStatus.SUCCEEDED,
                transactionRef,
                Instant.now(),
                Instant.now()
        );
        payment.setPaidAt(Instant.now());
        if (request.note() != null) {
            payment.setNote(request.note());
        }
        paymentRepository.save(payment);

        // 2. Chuyển trạng thái hóa đơn sang PAID
        invoice.setStatus("PAID");
        invoice.setPaymentMethod(method.name());
        invoice.setAmountPaid(request.amountPaid());
        invoice.setPaidAt(Instant.now());
        if (request.note() != null) {
            invoice.setNote(request.note());
        }
        invoice.setUpdatedAt(Instant.now());
        invoiceRepository.save(invoice);

        return new BillingDtos.PayInvoiceResponse(
                invoice.getId(),
                invoice.getAppointmentId(),
                "PAID",
                request.amountPaid(),
                method.name(),
                transactionRef,
                invoice.getPaidAt(),
                "Thanh toán viện phí thành công."
        );
    }
}
