package com.medsched.doctor;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.MedicalRecordEntity;
import com.medsched.persistence.entity.PrescriptionEntity;
import com.medsched.persistence.entity.PrescriptionItemEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicalRecordJpaRepository;
import com.medsched.persistence.repository.PrescriptionItemJpaRepository;
import com.medsched.persistence.repository.PrescriptionJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
public class DoctorPrescriptionService {

    private final AppointmentJpaRepository appointmentRepository;
    private final MedicalRecordJpaRepository medicalRecordRepository;
    private final PrescriptionItemJpaRepository prescriptionItemRepository;
    private final PrescriptionJpaRepository prescriptionRepository;
    private final DoctorJpaRepository doctorRepository;
    private final UserJpaRepository userRepository;

    public DoctorPrescriptionService(AppointmentJpaRepository appointmentRepository,
                                   MedicalRecordJpaRepository medicalRecordRepository,
                                   PrescriptionItemJpaRepository prescriptionItemRepository,
                                   PrescriptionJpaRepository prescriptionRepository,
                                   DoctorJpaRepository doctorRepository,
                                   UserJpaRepository userRepository) {
        this.appointmentRepository = appointmentRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
    }

    /**
     * CLAB-107: Bác sĩ hoàn tất khám & kê đơn thuốc điện tử.
     * 1. Ghi nhận kết luận chẩn đoán bệnh án vào bảng medical_records.
     * 2. Kê danh sách thuốc (tên, số lượng, cách dùng, đơn giá) vào prescriptions & prescription_items.
     * 3. Đổi trạng thái ca khám sang COMPLETED.
     */
    @Transactional
    public DoctorPrescriptionDtos.PrescriptionResponse completeConsultation(
            String appointmentId,
            DoctorPrescriptionDtos.CreatePrescriptionRequest request) {

        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalArgumentException("Ca khám đã bị hủy, không thể kê đơn thuốc.");
        }

        // 1. Lưu hồ sơ bệnh án
        MedicalRecordEntity medicalRecord = medicalRecordRepository.findByAppointmentId(appointmentId)
                .orElseGet(() -> new MedicalRecordEntity(
                        UUID.randomUUID().toString(),
                        appointmentId,
                        request.diagnosis(),
                        request.doctorAdvice(),
                        Instant.now(),
                        Instant.now()
                ));
        medicalRecord.setUpdatedAt(Instant.now());
        medicalRecord = medicalRecordRepository.save(medicalRecord);

        // 2. Kê đơn thuốc và tính tổng chi phí thuốc
        String prescriptionId = "pr" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        BigDecimal totalMedicineAmount = BigDecimal.ZERO;

        if (request.items() != null && !request.items().isEmpty()) {
            for (DoctorPrescriptionDtos.PrescriptionItemRequest itemReq : request.items()) {
                BigDecimal qty = itemReq.quantity() != null ? itemReq.quantity() : BigDecimal.ONE;
                BigDecimal price = itemReq.unitPrice() != null ? itemReq.unitPrice() : BigDecimal.ZERO;
                totalMedicineAmount = totalMedicineAmount.add(qty.multiply(price));

                PrescriptionItemEntity item = new PrescriptionItemEntity(
                        UUID.randomUUID().toString(),
                        medicalRecord.getId(),
                        null,
                        itemReq.medicineName(),
                        itemReq.unit() != null ? itemReq.unit() : "Viên",
                        itemReq.dosage() != null ? itemReq.dosage() : "",
                        itemReq.dosage() != null ? itemReq.dosage() : "Theo chỉ định",
                        null,
                        qty,
                        itemReq.dosage(),
                        Instant.now(),
                        Instant.now()
                );
                item.setUnitPrice(price);
                item.setPrescriptionId(prescriptionId);
                prescriptionItemRepository.save(item);
            }
        }

        // 3. Tra cứu tên bác sĩ phụ trách
        String doctorName = "Bác sĩ phụ trách";
        if (appointment.getDoctorId() != null) {
            var doctorOpt = doctorRepository.findById(appointment.getDoctorId());
            if (doctorOpt.isPresent()) {
                var doctor = doctorOpt.get();
                var userOpt = userRepository.findById(doctor.getUserId());
                if (userOpt.isPresent()) {
                    String prefix = (doctor.getAcademicTitle() != null && !doctor.getAcademicTitle().isBlank())
                            ? doctor.getAcademicTitle() + " "
                            : "BS. ";
                    doctorName = prefix + userOpt.get().getFullName();
                }
            }
        }

        // 4. Lưu đơn thuốc
        PrescriptionEntity prescription = new PrescriptionEntity(
                prescriptionId,
                appointmentId,
                medicalRecord.getId(),
                appointment.getDoctorId(),
                doctorName,
                totalMedicineAmount,
                "COMPLETED",
                Instant.now(),
                Instant.now()
        );
        prescription = prescriptionRepository.save(prescription);

        // 5. Cập nhật trạng thái ca khám sang COMPLETED
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setUpdatedAt(Instant.now());
        appointmentRepository.save(appointment);

        return new DoctorPrescriptionDtos.PrescriptionResponse(
                prescription.getId(),
                appointment.getId(),
                doctorName,
                totalMedicineAmount,
                appointment.getStatus().name(),
                prescription.getCreatedAt()
        );
    }
}
