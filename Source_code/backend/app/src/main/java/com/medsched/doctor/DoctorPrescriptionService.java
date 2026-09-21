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

import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class DoctorPrescriptionService {

    private final AppointmentJpaRepository appointmentRepository;
    private final MedicalRecordJpaRepository medicalRecordRepository;
    private final PrescriptionItemJpaRepository prescriptionItemRepository;
    private final PrescriptionJpaRepository prescriptionRepository;
    private final DoctorJpaRepository doctorRepository;
    private final UserJpaRepository userRepository;
    private final PatientProfileJpaRepository patientProfileRepository;
    private final TimeSlotJpaRepository timeSlotRepository;

    public DoctorPrescriptionService(AppointmentJpaRepository appointmentRepository,
                                   MedicalRecordJpaRepository medicalRecordRepository,
                                   PrescriptionItemJpaRepository prescriptionItemRepository,
                                   PrescriptionJpaRepository prescriptionRepository,
                                   DoctorJpaRepository doctorRepository,
                                   UserJpaRepository userRepository,
                                   PatientProfileJpaRepository patientProfileRepository,
                                   TimeSlotJpaRepository timeSlotRepository) {
        this.appointmentRepository = appointmentRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.timeSlotRepository = timeSlotRepository;
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

    /**
     * Lấy danh sách toàn bộ bệnh nhân khám hôm nay của bác sĩ:
     * - CHECKED_IN (Đang chờ khám)
     * - IN_PROGRESS (Đang trong buồng khám)
     * - COMPLETED (Đã khám xong)
     * - CONFIRMED (Sẽ đến khám trong hôm nay / Đã hẹn trước)
     */
    @Transactional(readOnly = true)
    public List<DoctorPrescriptionDtos.QueuePatientDto> getDoctorQueue(String userId, String queryDoctorId) {
        String targetDoctorId = queryDoctorId;
        if (targetDoctorId == null || targetDoctorId.isBlank()) {
            List<DoctorEntity> doctors = doctorRepository.findByUserId(userId);
            if (!doctors.isEmpty()) {
                targetDoctorId = doctors.get(0).getId();
            } else {
                List<DoctorEntity> allDocs = doctorRepository.findAll();
                if (!allDocs.isEmpty()) {
                    targetDoctorId = allDocs.get(0).getId();
                } else {
                    return List.of();
                }
            }
        }

        List<AppointmentEntity> appointments = appointmentRepository.findByDoctorIdAndStatusInOrderByQueueNumberAsc(
                targetDoctorId,
                List.of(
                        AppointmentStatus.IN_PROGRESS,
                        AppointmentStatus.CHECKED_IN,
                        AppointmentStatus.CONFIRMED,
                        AppointmentStatus.COMPLETED
                )
        );

        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

        return appointments.stream().map(a -> {
            PatientProfileEntity profile = patientProfileRepository.findById(a.getPatientProfileId()).orElse(null);
            String patientName = profile != null ? profile.getFullName() : "Bệnh nhân";
            String gender = profile != null && profile.getGender() != null
                    ? (profile.getGender().name().equals("FEMALE") ? "Nữ" : "Nam")
                    : "Nam";
            int birthYear = profile != null && profile.getDateOfBirth() != null
                    ? profile.getDateOfBirth().getYear()
                    : 1995;
            String phone = profile != null && profile.getPhone() != null ? profile.getPhone() : "";
            String cccd = profile != null && profile.getCccdNumber() != null ? profile.getCccdNumber() : "";

            String uiStatus = "WAITING";
            if (a.getStatus() == AppointmentStatus.IN_PROGRESS) {
                uiStatus = "IN_CONSULTATION";
            } else if (a.getStatus() == AppointmentStatus.COMPLETED) {
                uiStatus = "COMPLETED";
            } else if (a.getStatus() == AppointmentStatus.CONFIRMED) {
                uiStatus = "UPCOMING";
            }

            String checkInTimeStr = a.getCheckInTime() != null ? a.getCheckInTime().toString() : "";

            String appointmentTime = "";
            if (a.getSlotId() != null) {
                TimeSlotEntity slot = timeSlotRepository.findById(a.getSlotId()).orElse(null);
                if (slot != null && slot.getStartTime() != null && slot.getEndTime() != null) {
                    appointmentTime = timeFormatter.format(slot.getStartTime()) + " - " + timeFormatter.format(slot.getEndTime());
                }
            }

            return new DoctorPrescriptionDtos.QueuePatientDto(
                    a.getId(),
                    a.getQueueNumber(),
                    a.getBookingCode(),
                    patientName,
                    gender,
                    birthYear,
                    phone,
                    cccd,
                    a.getPatientSymptoms() != null ? a.getPatientSymptoms() : "",
                    a.getAiSummary() != null ? a.getAiSummary() : "",
                    uiStatus,
                    checkInTimeStr,
                    appointmentTime
            );
        }).toList();
    }

    /**
     * Bác sĩ tiếp nhận ca khám vào phòng (chuyển sang IN_PROGRESS).
     */
    @Transactional
    public void callPatientToRoom(String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));
        appointment.setStatus(AppointmentStatus.IN_PROGRESS);
        if (appointment.getCheckInTime() == null) {
            appointment.setCheckInTime(Instant.now());
        }
        appointment.setUpdatedAt(Instant.now());
        appointmentRepository.save(appointment);
    }

    /**
     * Tiếp nhận nhanh bệnh nhân đã đến phòng khám (chuyển từ CONFIRMED sang CHECKED_IN).
     */
    @Transactional
    public void admitPatient(String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));
        appointment.setStatus(AppointmentStatus.CHECKED_IN);
        if (appointment.getCheckInTime() == null) {
            appointment.setCheckInTime(Instant.now());
        }
        appointment.setUpdatedAt(Instant.now());
        appointmentRepository.save(appointment);
    }
}

