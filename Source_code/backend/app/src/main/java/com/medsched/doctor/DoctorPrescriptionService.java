package com.medsched.doctor;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.MedicalRecordEntity;
import com.medsched.persistence.entity.PrescriptionEntity;
import com.medsched.persistence.entity.PrescriptionItemEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.QueueType;
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
import java.time.LocalDate;
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
    private final AppointmentReconciliationService reconciliationService;

    public DoctorPrescriptionService(AppointmentJpaRepository appointmentRepository,
                                   MedicalRecordJpaRepository medicalRecordRepository,
                                   PrescriptionItemJpaRepository prescriptionItemRepository,
                                   PrescriptionJpaRepository prescriptionRepository,
                                   DoctorJpaRepository doctorRepository,
                                   UserJpaRepository userRepository,
                                   PatientProfileJpaRepository patientProfileRepository,
                                   TimeSlotJpaRepository timeSlotRepository,
                                   AppointmentReconciliationService reconciliationService) {
        this.appointmentRepository = appointmentRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.reconciliationService = reconciliationService;
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
        return getDoctorQueue(userId, queryDoctorId, null);
    }

    @Transactional
    public List<DoctorPrescriptionDtos.QueuePatientDto> getDoctorQueue(String userId, String queryDoctorId, LocalDate queryDate) {
        // Tự động kết toán các ca của ngày cũ trước khi lấy hàng đợi hôm nay
        reconciliationService.reconcileStaleAppointments();

        String targetDoctorId = queryDoctorId;
        boolean isAllDoctors = false;
        if (targetDoctorId == null || targetDoctorId.isBlank()) {
            List<DoctorEntity> doctors = doctorRepository.findByUserId(userId);
            if (!doctors.isEmpty()) {
                targetDoctorId = doctors.get(0).getId();
            } else {
                // Người dùng không phải bác sĩ (ví dụ Lễ tân quầy tiếp đón / Admin) -> Lấy danh sách toàn viện!
                isAllDoctors = true;
            }
        }

        List<AppointmentEntity> appointments;
        if (isAllDoctors) {
            appointments = appointmentRepository.findByStatusInOrderByQueueNumberAsc(
                    List.of(
                            AppointmentStatus.IN_PROGRESS,
                            AppointmentStatus.CHECKED_IN,
                            AppointmentStatus.CONFIRMED,
                            AppointmentStatus.WAITING_FOR_LAB_RESULTS,
                            AppointmentStatus.COMPLETED
                    )
            );
        } else {
            appointments = appointmentRepository.findByDoctorIdAndStatusInOrderByQueueNumberAsc(
                    targetDoctorId,
                    List.of(
                            AppointmentStatus.IN_PROGRESS,
                            AppointmentStatus.CHECKED_IN,
                            AppointmentStatus.CONFIRMED,
                            AppointmentStatus.WAITING_FOR_LAB_RESULTS,
                            AppointmentStatus.COMPLETED
                    )
            );
        }

        LocalDate targetDate = queryDate != null ? queryDate : LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

        return appointments.stream()
                .filter(a -> {
                    // 1. Kiểm tra ngày theo ca khám (TimeSlot)
                    if (a.getSlotId() != null) {
                        TimeSlotEntity slot = timeSlotRepository.findById(a.getSlotId()).orElse(null);
                        if (slot != null && slot.getStartTime() != null) {
                            LocalDate slotDate = slot.getStartTime().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
                            return slotDate.equals(targetDate);
                        }
                    }
                    // 2. Kiểm tra ngày check-in tại phòng khám
                    if (a.getCheckInTime() != null) {
                        LocalDate checkInDate = a.getCheckInTime().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
                        return checkInDate.equals(targetDate);
                    }
                    // 3. Fallback kiểm tra ngày tạo ca khám (vãng lai không có slot)
                    if (a.getCreatedAt() != null) {
                        LocalDate createdDate = a.getCreatedAt().atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
                        return createdDate.equals(targetDate);
                    }
                    return false;
                })
                .map(a -> {
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

            // Nạp thông tin bác sĩ phụ trách ca này
            DoctorEntity doc = a.getDoctorId() != null ? doctorRepository.findById(a.getDoctorId()).orElse(null) : null;
            String docId = a.getDoctorId() != null ? a.getDoctorId() : "";
            String docName = "Bác sĩ phụ trách";
            String roomNumber = "Phòng khám chuyên khoa";
            if (doc != null) {
                if (doc.getRoomNumber() != null) {
                    roomNumber = doc.getRoomNumber();
                }
                var user = doc.getUserId() != null ? userRepository.findById(doc.getUserId()).orElse(null) : null;
                String userFullName = user != null ? user.getFullName() : "Bác sĩ";
                docName = (doc.getAcademicTitle() != null ? doc.getAcademicTitle() + " " : "") + userFullName;
            }

            TimeSlotEntity slot = null;
            String appointmentTime = "";
            if (a.getSlotId() != null) {
                slot = timeSlotRepository.findById(a.getSlotId()).orElse(null);
                if (slot != null && slot.getStartTime() != null && slot.getEndTime() != null) {
                    appointmentTime = timeFormatter.format(slot.getStartTime()) + " - " + timeFormatter.format(slot.getEndTime());
                }
            }

            String uiStatus = "WAITING";
            if (a.getStatus() == AppointmentStatus.IN_PROGRESS) {
                uiStatus = "IN_CONSULTATION";
            } else if (a.getStatus() == AppointmentStatus.COMPLETED) {
                uiStatus = "COMPLETED";
            } else if (a.getStatus() == AppointmentStatus.CONFIRMED) {
                // Kiểm tra ca hẹn đặt trước đã qua khung giờ khám mà bệnh nhân không check-in
                if (slot != null && slot.getEndTime() != null && slot.getEndTime().isBefore(Instant.now())) {
                    a.setStatus(AppointmentStatus.MISSED_NO_SHOW);
                    a.setUpdatedAt(Instant.now());
                    appointmentRepository.save(a);
                    uiStatus = "MISSED_CALL";
                } else {
                    uiStatus = "UPCOMING";
                }
            } else if (a.getStatus() == AppointmentStatus.WAITING_FOR_LAB_RESULTS) {
                uiStatus = "DEFERRED";
            }

            String checkInTimeStr = a.getCheckInTime() != null ? a.getCheckInTime().toString() : "";

            String formattedQueueNum = a.getQueueNumber() != null ? a.getQueueNumber() : "";
            if (formattedQueueNum.startsWith("APP-")) {
                formattedQueueNum = "A-" + formattedQueueNum.substring(4);
            } else if (formattedQueueNum.startsWith("WALK-")) {
                formattedQueueNum = "W-" + formattedQueueNum.substring(5);
            } else if (!formattedQueueNum.isBlank() && !formattedQueueNum.startsWith("A-") && !formattedQueueNum.startsWith("W-")) {
                if (a.getQueueType() == com.medsched.persistence.enums.QueueType.WALKIN) {
                    formattedQueueNum = "W-" + formattedQueueNum;
                } else {
                    formattedQueueNum = "A-" + formattedQueueNum;
                }
            }

            return new DoctorPrescriptionDtos.QueuePatientDto(
                    a.getId(),
                    formattedQueueNum,
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
                    appointmentTime,
                    docId,
                    docName,
                    roomNumber
            );
        }).toList();
    }

    /**
     * Bác sĩ tiếp nhận ca khám vào phòng (chuyển sang IN_PROGRESS).
     * BẢO ĐẢM NGUYÊN TẮC: 1 Bác sĩ chỉ khám DUY NHẤT 1 ca tại 1 thời điểm.
     */
    @Transactional
    public void callPatientToRoom(String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));

        // Tự động thu hồi các ca khám dở dang trước đó của bác sĩ này về trạng thái CHECKED_IN
        if (appointment.getDoctorId() != null) {
            List<AppointmentEntity> activeAppointments = appointmentRepository.findByDoctorIdAndStatus(
                    appointment.getDoctorId(), AppointmentStatus.IN_PROGRESS);
            for (AppointmentEntity prevActive : activeAppointments) {
                if (!prevActive.getId().equals(appointmentId)) {
                    prevActive.setStatus(AppointmentStatus.CHECKED_IN);
                    prevActive.setUpdatedAt(Instant.now());
                    appointmentRepository.save(prevActive);
                }
            }
        }

        appointment.setStatus(AppointmentStatus.IN_PROGRESS);
        if (appointment.getCheckInTime() == null) {
            appointment.setCheckInTime(Instant.now());
        }
        appointment.setUpdatedAt(Instant.now());
        appointmentRepository.save(appointment);
    }

    /**
     * Bác sĩ tạm hoãn ca khám hiện tại (chuyển sang WAITING_FOR_LAB_RESULTS).
     */
    @Transactional
    public void deferPatient(String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));
        appointment.setStatus(AppointmentStatus.WAITING_FOR_LAB_RESULTS);
        appointment.setUpdatedAt(Instant.now());
        appointmentRepository.save(appointment);
    }

    /**
     * Bác sĩ đánh dấu bệnh nhân vắng mặt khi gọi loa (MISSED_NO_SHOW).
     */
    @Transactional
    public void missPatient(String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));
        appointment.setStatus(AppointmentStatus.MISSED_NO_SHOW);
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

    /**
     * Tra cứu chi tiết kết quả khám & đơn thuốc điện tử theo ID ca khám.
     */
    @Transactional(readOnly = true)
    public DoctorPrescriptionDtos.PrescriptionDetailDto getPrescriptionDetailsByAppointmentId(String appointmentId) {
        AppointmentEntity appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + appointmentId));

        MedicalRecordEntity medicalRecord = medicalRecordRepository.findByAppointmentId(appointmentId)
                .orElse(null);

        PrescriptionEntity prescription = prescriptionRepository.findByAppointmentId(appointmentId)
                .orElse(null);

        String diagnosis = medicalRecord != null ? medicalRecord.getDiagnosis() : "";
        String doctorAdvice = medicalRecord != null ? medicalRecord.getDoctorNotes() : "";
        String prescriptionId = prescription != null ? prescription.getId() : "";
        String doctorName = prescription != null && prescription.getDoctorName() != null 
                ? prescription.getDoctorName() 
                : "Bác sĩ phụ trách";
        BigDecimal totalMedicineAmount = prescription != null && prescription.getTotalMedicineAmount() != null 
                ? prescription.getTotalMedicineAmount() 
                : BigDecimal.ZERO;
        String status = prescription != null ? prescription.getStatus() : appointment.getStatus().name();
        Instant createdAt = prescription != null ? prescription.getCreatedAt() : appointment.getUpdatedAt();

        List<DoctorPrescriptionDtos.PrescriptionItemDetailDto> itemDtos = List.of();
        if (medicalRecord != null) {
            List<PrescriptionItemEntity> items = prescriptionItemRepository.findByMedicalRecordId(medicalRecord.getId());
            itemDtos = items.stream().map(item -> {
                BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ONE;
                BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal totalPrice = qty.multiply(unitPrice);
                String dosage = item.getDosage() != null && !item.getDosage().isBlank() 
                        ? item.getDosage() 
                        : (item.getInstruction() != null ? item.getInstruction() : "Theo chỉ định");
                return new DoctorPrescriptionDtos.PrescriptionItemDetailDto(
                        item.getId(),
                        item.getMedicineName(),
                        item.getUnit() != null ? item.getUnit() : "Viên",
                        qty,
                        dosage,
                        unitPrice,
                        totalPrice
                );
            }).toList();
        }

        return new DoctorPrescriptionDtos.PrescriptionDetailDto(
                prescriptionId,
                appointment.getId(),
                doctorName,
                diagnosis,
                doctorAdvice,
                totalMedicineAmount,
                status,
                createdAt,
                itemDtos
        );
    }

    /**
     * Tra cứu lịch sử bệnh nhân từng khám và đơn thuốc đã kê của bác sĩ.
     */
    @Transactional(readOnly = true)
    public List<DoctorPrescriptionDtos.ConsultationHistoryItemDto> getDoctorConsultationHistory(
            String userId, String queryDoctorId, String keyword, LocalDate from, LocalDate to) {

        String targetDoctorId = queryDoctorId;
        if (targetDoctorId == null || targetDoctorId.isBlank()) {
            if (userId != null) {
                List<DoctorEntity> doctors = doctorRepository.findByUserId(userId);
                if (!doctors.isEmpty()) {
                    targetDoctorId = doctors.get(0).getId();
                }
            }
        }

        List<AppointmentEntity> completedList;
        if (targetDoctorId != null && !targetDoctorId.isBlank()) {
            completedList = appointmentRepository.findByDoctorIdAndStatus(targetDoctorId, AppointmentStatus.COMPLETED);
        } else {
            completedList = appointmentRepository.findByStatus(AppointmentStatus.COMPLETED);
        }

        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy").withZone(vnZone);
        String kw = keyword != null ? keyword.trim().toLowerCase() : "";

        return completedList.stream()
                .filter(a -> {
                    Instant t = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
                    if (t == null) return true;
                    LocalDate apptDate = t.atZone(vnZone).toLocalDate();
                    if (from != null && apptDate.isBefore(from)) return false;
                    if (to != null && apptDate.isAfter(to)) return false;
                    return true;
                })
                .sorted((a, b) -> {
                    Instant t1 = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
                    Instant t2 = b.getUpdatedAt() != null ? b.getUpdatedAt() : b.getCreatedAt();
                    if (t1 == null || t2 == null) return 0;
                    return t2.compareTo(t1);
                })
                .map(a -> {
                    PatientProfileEntity profile = patientProfileRepository.findById(a.getPatientProfileId()).orElse(null);
                    String patientName = profile != null ? profile.getFullName() : "Bệnh nhân";
                    String gender = profile != null && profile.getGender() != null
                            ? (profile.getGender().name().equals("FEMALE") ? "Nữ" : "Nam")
                            : "Nam";
                    int birthYear = profile != null && profile.getDateOfBirth() != null
                            ? profile.getDateOfBirth().getYear()
                            : 1990;
                    String phone = profile != null && profile.getPhone() != null ? profile.getPhone() : "";

                    MedicalRecordEntity medRecord = medicalRecordRepository.findByAppointmentId(a.getId()).orElse(null);
                    String diagnosis = medRecord != null && medRecord.getDiagnosis() != null ? medRecord.getDiagnosis() : "Chẩn đoán thông thường";
                    String advice = medRecord != null && medRecord.getDoctorNotes() != null ? medRecord.getDoctorNotes() : "";

                    PrescriptionEntity rx = prescriptionRepository.findByAppointmentId(a.getId()).orElse(null);
                    String rxId = rx != null ? rx.getId() : "";
                    BigDecimal rxTotal = rx != null && rx.getTotalMedicineAmount() != null ? rx.getTotalMedicineAmount() : BigDecimal.ZERO;
                    int medCount = 0;
                    if (medRecord != null) {
                        medCount = prescriptionItemRepository.findByMedicalRecordId(medRecord.getId()).size();
                    }

                    Instant consultTime = a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getCreatedAt();
                    String formattedDate = consultTime != null ? dtf.format(consultTime) : "";

                    String queueNum = a.getQueueNumber() != null ? a.getQueueNumber() : "STT-01";
                    if (a.getQueueType() == QueueType.WALKIN && !queueNum.startsWith("W-")) {
                        queueNum = "W-" + queueNum;
                    } else if (a.getQueueType() == QueueType.ONLINE_BOOKED && !queueNum.startsWith("A-")) {
                        queueNum = "A-" + queueNum;
                    }

                    return new DoctorPrescriptionDtos.ConsultationHistoryItemDto(
                            a.getId(),
                            a.getBookingCode(),
                            queueNum,
                            a.getQueueType() != null ? a.getQueueType().name() : "WALKIN",
                            patientName,
                            gender,
                            birthYear,
                            phone,
                            a.getPatientSymptoms() != null ? a.getPatientSymptoms() : "",
                            diagnosis,
                            advice,
                            rxId,
                            rxTotal,
                            medCount,
                            consultTime,
                            formattedDate
                    );
                })
                .filter(item -> {
                    if (kw.isBlank()) return true;
                    return item.patientName().toLowerCase().contains(kw)
                            || item.bookingCode().toLowerCase().contains(kw)
                            || item.phone().toLowerCase().contains(kw)
                            || item.diagnosis().toLowerCase().contains(kw);
                })
                .toList();
    }
}

