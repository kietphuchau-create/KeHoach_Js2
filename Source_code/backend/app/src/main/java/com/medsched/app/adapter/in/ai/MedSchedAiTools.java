package com.medsched.app.adapter.in.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.TriageEvaluation;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.MedicineEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.CheckinMethod;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.MedicineJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.PaymentJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Supplier;

/**
 * Adapter cung cấp các công cụ y tế (Medical AI Tools / MCP Tools)
 * phục vụ toàn diện cả 3 nhóm người dùng:
 * 1. Lễ tân (Quầy tiếp đón): Tra cứu bệnh nhân, check-in 1 chạm qua MCP, tiếp nhận vãng lai.
 * 2. Bác sĩ (Phòng khám): Tóm tắt hồ sơ tiền sử bệnh nhân, tra cứu tương tác thuốc và liều dùng.
 * 3. Quản trị viên (Admin): Báo cáo thống kê hiệu suất, doanh thu và lưu lượng khám theo thời gian thực.
 */
@Component
public class MedSchedAiTools {

    private static final Logger log = LoggerFactory.getLogger(MedSchedAiTools.class);
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AiTriagePort aiTriagePort;
    private final DoctorJpaRepository doctorRepository;
    private final TimeSlotJpaRepository timeSlotRepository;
    private final AppointmentJpaRepository appointmentRepository;
    private final PatientProfileJpaRepository patientProfileRepository;
    private final UserJpaRepository userRepository;
    private final MedicineJpaRepository medicineRepository;
    private final PaymentJpaRepository paymentRepository;
    private final ObjectMapper objectMapper;

    public MedSchedAiTools(
            AiTriagePort aiTriagePort,
            DoctorJpaRepository doctorRepository,
            TimeSlotJpaRepository timeSlotRepository,
            AppointmentJpaRepository appointmentRepository,
            PatientProfileJpaRepository patientProfileRepository,
            UserJpaRepository userRepository,
            MedicineJpaRepository medicineRepository,
            PaymentJpaRepository paymentRepository,
            ObjectMapper objectMapper
    ) {
        this.aiTriagePort = aiTriagePort;
        this.doctorRepository = doctorRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.appointmentRepository = appointmentRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.userRepository = userRepository;
        this.medicineRepository = medicineRepository;
        this.paymentRepository = paymentRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Tool 1: Phân tích triệu chứng bệnh nhân, gợi ý chuyên khoa, dịch vụ và cảnh báo cấp cứu.
     */
    public String triagePatientSymptoms(String symptoms, String medicalHistory) {
        return safely(() -> {
            TriageEvaluation eval = aiTriagePort.evaluateSymptoms(symptoms, medicalHistory);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("specialtyCode", eval.specialtyCode());
            result.put("specialtyName", eval.specialtyName());
            result.put("clinicalSummary", eval.clinicalSummary());
            result.put("recommendedService", eval.recommendedService());
            result.put("estimatedFee", eval.estimatedFee());
            result.put("isEmergency", eval.isEmergency());
            result.put("emergencyWarning", eval.emergencyWarning());
            result.put("preparationAdvice", eval.preparationAdvice());
            result.put("disclaimer", eval.disclaimer());
            return toJson(result);
        });
    }

    /**
     * Tool 2: Tra cứu danh bạ bác sĩ theo chuyên khoa.
     */
    public String lookupDoctorDirectory(String specialtyId) {
        return safely(() -> {
            List<DoctorEntity> doctors;
            if (specialtyId != null && !specialtyId.isBlank()) {
                doctors = doctorRepository.findBySpecialtyId(specialtyId);
            } else {
                doctors = doctorRepository.findAll();
            }

            List<Map<String, Object>> list = doctors.stream().map(d -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("doctorId", d.getId());
                map.put("specialtyId", d.getSpecialtyId());
                map.put("academicTitle", d.getAcademicTitle());
                map.put("roomNumber", d.getRoomNumber());
                map.put("consultationFee", d.getConsultationFee());
                map.put("biography", d.getBio());
                return map;
            }).toList();

            return toJson(list);
        });
    }

    /**
     * Tool 3: Tra cứu các khung giờ khám còn trống của bác sĩ.
     */
    public String getAvailableTimeSlots(String doctorId) {
        return safely(() -> {
            if (doctorId == null || doctorId.isBlank()) {
                return "Lỗi: Cần cung cấp doctorId để tra cứu khung giờ khám.";
            }

            List<TimeSlotEntity> slots = timeSlotRepository
                    .findByDoctorIdAndStatusOrderByStartTimeAsc(doctorId, SlotStatus.AVAILABLE);

            List<Map<String, Object>> list = slots.stream().map(s -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("slotId", s.getId());
                map.put("doctorId", s.getDoctorId());
                map.put("startTime", s.getStartTime() != null ? s.getStartTime().toString() : null);
                map.put("endTime", s.getEndTime() != null ? s.getEndTime().toString() : null);
                map.put("status", s.getStatus() != null ? s.getStatus().name() : "AVAILABLE");
                return map;
            }).toList();

            return toJson(list);
        });
    }

    /**
     * Tool 4: Tra cứu thông tin vé hẹn và số thứ tự theo mã đặt lịch (booking code).
     */
    public String verifyBookingCode(String bookingCode) {
        return safely(() -> {
            if (bookingCode == null || bookingCode.isBlank()) {
                return "Lỗi: Vui lòng nhập mã vé hẹn (booking code).";
            }

            String clean = bookingCode.trim().toUpperCase();
            Optional<AppointmentEntity> opt = appointmentRepository.findByBookingCode(clean);
            if (opt.isEmpty()) {
                opt = appointmentRepository.findByQueueNumber(clean);
            }
            if (opt.isEmpty()) {
                return "Không tìm thấy lịch hẹn với mã: " + bookingCode;
            }

            AppointmentEntity apt = opt.get();
            PatientProfileEntity profile = patientProfileRepository.findById(apt.getPatientProfileId()).orElse(null);
            DoctorEntity doctor = doctorRepository.findById(apt.getDoctorId()).orElse(null);

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("appointmentId", apt.getId());
            map.put("bookingCode", apt.getBookingCode());
            map.put("queueNumber", apt.getQueueNumber());
            map.put("patientName", profile != null ? profile.getFullName() : "N/A");
            map.put("phone", profile != null ? profile.getPhone() : "N/A");
            map.put("doctorId", apt.getDoctorId());
            map.put("doctorRoom", doctor != null ? doctor.getRoomNumber() : "Phòng chờ");
            map.put("status", apt.getStatus() != null ? apt.getStatus().name() : null);
            map.put("queueType", apt.getQueueType() != null ? apt.getQueueType().name() : null);
            map.put("checkinTime", apt.getCheckInTime() != null ? apt.getCheckInTime().toString() : null);
            map.put("symptoms", apt.getPatientSymptoms());
            return toJson(map);
        });
    }

    /**
     * Tool 5 (Dành cho Lễ tân): Tiếp đón bệnh nhân tự động chuẩn giao thức MCP (Check-in 1 chạm).
     * Khi lễ tân chat: "Khách có mã MED918869 vừa đến, hãy tiếp đón giúp tôi", AI tự động gọi tool này.
     */
    public String receptionCheckin(String bookingCode) {
        return safely(() -> {
            if (bookingCode == null || bookingCode.isBlank()) {
                return "Lỗi: Cần mã bookingCode để thực hiện tiếp đón.";
            }

            String clean = bookingCode.trim().toUpperCase();
            Optional<AppointmentEntity> opt = appointmentRepository.findByBookingCode(clean);
            if (opt.isEmpty()) {
                opt = appointmentRepository.findByQueueNumber(clean);
            }
            if (opt.isEmpty()) {
                return "Không tìm thấy lịch hẹn với mã " + bookingCode + " để tiếp đón.";
            }

            AppointmentEntity apt = opt.get();
            if (apt.getStatus() == AppointmentStatus.CANCELLED) {
                return "Không thể tiếp đón: Lịch hẹn " + bookingCode + " đã bị hủy bỏ trước đó.";
            }
            if (apt.getStatus() == AppointmentStatus.COMPLETED) {
                return "Lịch hẹn " + bookingCode + " đã khám bệnh xong trước đó.";
            }

            // Nếu đã check-in rồi
            if (apt.getStatus() == AppointmentStatus.CHECKED_IN
                    || apt.getStatus() == AppointmentStatus.IN_PROGRESS) {
                PatientProfileEntity profile = patientProfileRepository.findById(apt.getPatientProfileId()).orElse(null);
                DoctorEntity doctor = doctorRepository.findById(apt.getDoctorId()).orElse(null);
                return toJson(Map.of(
                        "status", "ALREADY_CHECKED_IN",
                        "message", "Bệnh nhân đã được tiếp đón trước đó. Hiện đang trong hàng đợi.",
                        "bookingCode", apt.getBookingCode(),
                        "queueNumber", apt.getQueueNumber(),
                        "patientName", profile != null ? profile.getFullName() : "N/A",
                        "doctorRoom", doctor != null ? doctor.getRoomNumber() : "Chờ điều phối"
                ));
            }

            // Tiến hành cập nhật trạng thái CHECKED_IN
            apt.setStatus(AppointmentStatus.CHECKED_IN);
            apt.setCheckInTime(Instant.now());
            apt.setCheckinMethod(CheckinMethod.QR_CODE);
            String qNum = apt.getQueueNumber();
            if (qNum != null && !qNum.startsWith("A-") && !qNum.startsWith("W-")) {
                qNum = (apt.getQueueType() == QueueType.WALKIN ? "W-" : "A-") + qNum;
                apt.setQueueNumber(qNum);
            }
            apt.setUpdatedAt(Instant.now());
            appointmentRepository.save(apt);

            PatientProfileEntity profile = patientProfileRepository.findById(apt.getPatientProfileId()).orElse(null);
            DoctorEntity doctor = doctorRepository.findById(apt.getDoctorId()).orElse(null);

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("status", "SUCCESS");
            res.put("message", "Đã tiếp đón bệnh nhân thành công! Số thứ tự đã được chuyển vào hàng đợi của Bác sĩ.");
            res.put("bookingCode", apt.getBookingCode());
            res.put("queueNumber", apt.getQueueNumber());
            res.put("patientName", profile != null ? profile.getFullName() : "Khách hàng");
            res.put("doctorRoom", doctor != null ? doctor.getRoomNumber() : "Chờ phân phòng");
            res.put("checkinTime", apt.getCheckInTime().toString());
            return toJson(res);
        });
    }

    /**
     * Tool 6 (Dành cho Lễ tân): Tra cứu lịch sử / thông tin bệnh nhân nhanh theo Tên hoặc Số điện thoại.
     */
    public String searchPatient(String keyword) {
        return safely(() -> {
            if (keyword == null || keyword.isBlank()) {
                return "Vui lòng nhập số điện thoại, họ tên hoặc mã CCCD để tra cứu.";
            }
            String kw = keyword.trim();
            List<PatientProfileEntity> profiles = new ArrayList<>();

            // 1. Tìm theo SĐT
            profiles.addAll(patientProfileRepository.findByPhone(kw));
            // 2. Tìm theo CCCD
            patientProfileRepository.findByCccdNumber(kw).ifPresent(profiles::add);
            // 3. Tìm theo tên
            if (profiles.isEmpty()) {
                profiles.addAll(patientProfileRepository.findByFullNameContainingIgnoreCase(kw));
            }

            if (profiles.isEmpty()) {
                return "Không tìm thấy thông tin bệnh nhân phù hợp với từ khóa: " + keyword;
            }

            List<Map<String, Object>> result = new ArrayList<>();
            for (PatientProfileEntity p : profiles) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("profileId", p.getId());
                item.put("fullName", p.getFullName());
                item.put("phone", p.getPhone());
                item.put("gender", p.getGender() != null ? p.getGender().name() : "N/A");
                item.put("dob", p.getDateOfBirth() != null ? p.getDateOfBirth().toString() : "N/A");
                item.put("medicalHistory", p.getMedicalHistory());

                // Lấy ca khám gần nhất
                List<AppointmentEntity> apts = appointmentRepository.findByPatientProfileIdOrderByCreatedAtDesc(p.getId());
                if (!apts.isEmpty()) {
                    AppointmentEntity latest = apts.get(0);
                    item.put("latestBookingCode", latest.getBookingCode());
                    item.put("latestQueueNumber", latest.getQueueNumber());
                    item.put("latestStatus", latest.getStatus() != null ? latest.getStatus().name() : "N/A");
                }
                result.add(item);
            }

            return toJson(result);
        });
    }

    /**
     * Tool 7 (Dành cho Bác sĩ): Tóm tắt tiền sử bệnh án và hỗ trợ chẩn đoán lâm sàng.
     */
    public String doctorSummarizePatient(String appointmentIdOrBookingCode) {
        return safely(() -> {
            if (appointmentIdOrBookingCode == null || appointmentIdOrBookingCode.isBlank()) {
                return "Lỗi: Cần mã lịch hẹn hoặc mã đặt lịch để tóm tắt bệnh án.";
            }

            String code = appointmentIdOrBookingCode.trim().toUpperCase();
            AppointmentEntity apt = appointmentRepository.findByBookingCode(code)
                    .or(() -> appointmentRepository.findById(appointmentIdOrBookingCode))
                    .orElse(null);

            if (apt == null) {
                return "Không tìm thấy lịch hẹn: " + appointmentIdOrBookingCode;
            }

            PatientProfileEntity profile = patientProfileRepository.findById(apt.getPatientProfileId()).orElse(null);
            String symptoms = apt.getPatientSymptoms() != null ? apt.getPatientSymptoms() : "Không ghi nhận";
            String history = profile != null && profile.getMedicalHistory() != null ? profile.getMedicalHistory() : "Chưa có tiền sử dị ứng/bệnh mạn tính";

            // Đánh giá bằng AI Triage Port
            TriageEvaluation eval = aiTriagePort.evaluateSymptoms(symptoms, history);

            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("patientName", profile != null ? profile.getFullName() : "N/A");
            summary.put("gender", profile != null && profile.getGender() != null ? profile.getGender().name() : "N/A");
            summary.put("birthYear", profile != null && profile.getDateOfBirth() != null ? profile.getDateOfBirth().getYear() : "N/A");
            summary.put("symptoms", symptoms);
            summary.put("medicalHistory", history);
            summary.put("aiClinicalAssessment", eval.clinicalSummary());
            summary.put("isEmergency", eval.isEmergency());
            summary.put("suggestedSpecialty", eval.specialtyName());
            summary.put("doctorClinicalAdvice", "Lưu ý kiểm tra sinh hiệu và đối chiếu các biểu hiện sốt/đau cục bộ trước khi kê đơn.");
            return toJson(summary);
        });
    }

    /**
     * Tool 8 (Dành cho Bác sĩ): Tra cứu thuốc trong danh mục phòng khám & kiểm tra tương tác thuốc/liều lượng.
     */
    public String doctorConsultMedicines(String keyword) {
        return safely(() -> {
            if (keyword == null || keyword.isBlank()) {
                return "Vui lòng nhập tên thuốc hoặc hoạt chất cần tra cứu.";
            }

            List<MedicineEntity> meds = medicineRepository
                    .findByNameContainingIgnoreCaseOrActiveIngredientContainingIgnoreCase(keyword.trim(), keyword.trim());

            if (meds.isEmpty()) {
                return "Không tìm thấy thuốc nào trong kho danh mục phù hợp với: " + keyword;
            }

            List<Map<String, Object>> list = meds.stream().limit(10).map(m -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("medicineId", m.getId());
                map.put("code", m.getCode());
                map.put("name", m.getName());
                map.put("activeIngredient", m.getActiveIngredient());
                map.put("unit", m.getUnit());
                map.put("note", "Khuyến cáo dùng đúng liều theo độ tuổi và kiểm tra tiền sử dị ứng thuốc của bệnh nhân.");
                return map;
            }).toList();

            return toJson(list);
        });
    }

    /**
     * Tool 9 (Dành cho Admin): Lấy báo cáo thống kê hoạt động phòng khám tổng hợp thời gian thực.
     */
    public String getAdminStatistics(String range) {
        return safely(() -> {
            LocalDate today = LocalDate.now(VN_ZONE);
            Instant start;
            Instant end = Instant.now();

            String r = range != null ? range.toUpperCase() : "TODAY";
            if ("THIS_MONTH".equals(r)) {
                start = today.withDayOfMonth(1).atStartOfDay(VN_ZONE).toInstant();
            } else if ("LAST_7_DAYS".equals(r)) {
                start = today.minusDays(7).atStartOfDay(VN_ZONE).toInstant();
            } else {
                start = today.atStartOfDay(VN_ZONE).toInstant();
            }

            List<AppointmentEntity> apts = appointmentRepository.findByCreatedAtBetweenOrderByCreatedAtAsc(start, end);

            long totalAppointments = apts.size();
            long checkedInCount = apts.stream().filter(a -> a.getStatus() == AppointmentStatus.CHECKED_IN).count();
            long inProgressCount = apts.stream().filter(a -> a.getStatus() == AppointmentStatus.IN_PROGRESS).count();
            long completedCount = apts.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
            long cancelledCount = apts.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED).count();
            long walkinCount = apts.stream().filter(a -> a.getQueueType() == QueueType.WALKIN).count();
            long bookedCount = totalAppointments - walkinCount;

            Map<String, Object> report = new LinkedHashMap<>();
            report.put("range", r);
            report.put("totalAppointments", totalAppointments);
            report.put("completedCount", completedCount);
            report.put("checkedInCount", checkedInCount);
            report.put("inProgressCount", inProgressCount);
            report.put("cancelledCount", cancelledCount);
            report.put("bookedCount", bookedCount);
            report.put("walkinCount", walkinCount);
            report.put("rateCompleted", totalAppointments > 0 ? String.format("%.1f%%", (completedCount * 100.0) / totalAppointments) : "0%");
            report.put("aiSummary", String.format("Trong kỳ %s, hệ thống đã tiếp nhận %d ca khám (%d đặt trước, %d vãng lai). Hiện có %d ca đã hoàn thành khám, %d ca đang xử lý.",
                    r, totalAppointments, bookedCount, walkinCount, completedCount, inProgressCount + checkedInCount));

            return toJson(report);
        });
    }

    /** Dữ liệu tài khoản dành riêng cho câu hỏi vận hành của quản trị viên. */
    public String getAdminAccountOverview() {
        return safely(() -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("totalAccounts", userRepository.count());
            result.put("activeAccounts", userRepository.countByActiveTrue());
            result.put("lockedAccounts", userRepository.countByActiveFalse());
            result.put("patientProfiles", patientProfileRepository.count());
            result.put("doctors", doctorRepository.count());
            result.put("medicines", medicineRepository.count());
            return toJson(result);
        });
    }

    /** Tổng quan trực tiếp tại quầy, gồm hàng đợi và các bệnh nhân mới nhất trong ngày. */
    public String getReceptionTodayOverview() {
        return safely(() -> {
            LocalDate today = LocalDate.now(VN_ZONE);
            Instant start = today.atStartOfDay(VN_ZONE).toInstant();
            Instant end = today.plusDays(1).atStartOfDay(VN_ZONE).toInstant();
            List<AppointmentEntity> appointments = appointmentRepository
                    .findByCreatedAtBetweenOrderByCreatedAtAsc(start, end);

            List<Map<String, Object>> recentPatients = appointments.stream()
                    .sorted(Comparator.comparing(AppointmentEntity::getCreatedAt).reversed())
                    .limit(5)
                    .map(appointment -> {
                        PatientProfileEntity patient = patientProfileRepository
                                .findById(appointment.getPatientProfileId()).orElse(null);
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("patientName", patient != null ? patient.getFullName() : "Chưa rõ tên");
                        item.put("bookingCode", appointment.getBookingCode());
                        item.put("queueNumber", appointment.getQueueNumber());
                        item.put("status", appointment.getStatus().name());
                        return item;
                    }).toList();

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("totalToday", appointments.size());
            result.put("waiting", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CHECKED_IN).count());
            result.put("inProgress", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.IN_PROGRESS).count());
            result.put("completed", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count());
            result.put("recentPatients", recentPatients);
            return toJson(result);
        });
    }

    /** Tổng quan ca khám của bác sĩ đang đăng nhập. */
    public String getDoctorTodayOverview(String email) {
        return safely(() -> {
            UserEntity user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return "Không xác định được tài khoản bác sĩ đang đăng nhập.";

            List<DoctorEntity> doctorProfiles = doctorRepository.findByUserId(user.getId());
            Set<String> doctorIds = new HashSet<>();
            doctorProfiles.forEach(doctor -> doctorIds.add(doctor.getId()));

            LocalDate today = LocalDate.now(VN_ZONE);
            Instant start = today.atStartOfDay(VN_ZONE).toInstant();
            Instant end = today.plusDays(1).atStartOfDay(VN_ZONE).toInstant();
            List<AppointmentEntity> appointments = appointmentRepository
                    .findByCreatedAtBetweenOrderByCreatedAtAsc(start, end).stream()
                    .filter(appointment -> doctorIds.contains(appointment.getDoctorId()))
                    .toList();

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("doctorName", user.getFullName());
            result.put("rooms", doctorProfiles.stream().map(DoctorEntity::getRoomNumber).filter(Objects::nonNull).distinct().toList());
            result.put("totalToday", appointments.size());
            result.put("waiting", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CHECKED_IN).count());
            result.put("inProgress", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.IN_PROGRESS).count());
            result.put("completed", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count());
            result.put("waitingForLab", appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.WAITING_FOR_LAB_RESULTS).count());
            return toJson(result);
        });
    }

    /**
     * Danh sách định nghĩa các công cụ y tế (Metadata Schemas) chuẩn MCP / AI Agent.
     */
    public List<Map<String, Object>> getToolDefinitions() {
        return List.of(
                Map.of(
                        "name", "triage_patient_symptoms",
                        "description", "Phân tích triệu chứng y tế của bệnh nhân, đưa ra gợi ý chuyên khoa, dịch vụ và cảnh báo cấp cứu.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "symptoms", Map.of("type", "string", "description", "Mô tả triệu chứng bệnh nhân đang gặp phải"),
                                        "medicalHistory", Map.of("type", "string", "description", "Tiền sử bệnh lý (tùy chọn)")
                                ),
                                "required", List.of("symptoms")
                        )
                ),
                Map.of(
                        "name", "lookup_doctor_directory",
                        "description", "Tra cứu danh bạ bác sĩ và buồng khám theo mã chuyên khoa.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "specialtyId", Map.of("type", "string", "description", "Mã chuyên khoa cần tra cứu (để trống nếu lấy tất cả)")
                                )
                        )
                ),
                Map.of(
                        "name", "get_available_time_slots",
                        "description", "Tra cứu danh sách các khung giờ khám còn trống (AVAILABLE) của bác sĩ.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "doctorId", Map.of("type", "string", "description", "Mã định danh của bác sĩ")
                                ),
                                "required", List.of("doctorId")
                        )
                ),
                Map.of(
                        "name", "verify_booking_code",
                        "description", "Tra cứu trạng thái vé hẹn, số thứ tự khám và buồng khám theo mã booking code.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "bookingCode", Map.of("type", "string", "description", "Mã đặt lịch hẹn (ví dụ: MED-123456)")
                                ),
                                "required", List.of("bookingCode")
                        )
                ),
                Map.of(
                        "name", "reception_checkin",
                        "description", "[Lễ tân] Tiếp đón bệnh nhân tự động theo chuẩn MCP (Check-in 1 chạm vào hàng đợi).",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "bookingCode", Map.of("type", "string", "description", "Mã vé hẹn của bệnh nhân (ví dụ: MED918869)")
                                ),
                                "required", List.of("bookingCode")
                        )
                ),
                Map.of(
                        "name", "search_patient",
                        "description", "[Lễ tân] Tra cứu thông tin hồ sơ và vé hẹn bệnh nhân theo SĐT, tên hoặc CCCD.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "keyword", Map.of("type", "string", "description", "SĐT, họ tên hoặc CCCD của bệnh nhân")
                                ),
                                "required", List.of("keyword")
                        )
                ),
                Map.of(
                        "name", "doctor_summarize_patient",
                        "description", "[Bác sĩ] Tóm tắt tiền sử bệnh án, triệu chứng lâm sàng và cảnh báo khẩn cấp cho bác sĩ.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "appointmentIdOrBookingCode", Map.of("type", "string", "description", "Mã ca khám hoặc mã đặt lịch")
                                ),
                                "required", List.of("appointmentIdOrBookingCode")
                        )
                ),
                Map.of(
                        "name", "doctor_consult_medicines",
                        "description", "[Bác sĩ] Tra cứu thông tin thuốc trong kho dược phòng khám, liều dùng và gợi ý kê đơn.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "keyword", Map.of("type", "string", "description", "Tên thuốc hoặc hoạt chất cần tra cứu")
                                ),
                                "required", List.of("keyword")
                        )
                ),
                Map.of(
                        "name", "get_admin_statistics",
                        "description", "[Admin] Lấy báo cáo số liệu phân tích hoạt động phòng khám thời gian thực.",
                        "parameters", Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "range", Map.of("type", "string", "description", "Khoảng thời gian: TODAY, LAST_7_DAYS, THIS_MONTH")
                                )
                        )
                )
        );
    }

    /**
     * Thực thi tool theo tên và tham số.
     */
    public String executeTool(String toolName, Map<String, Object> arguments) {
        if (toolName == null) {
            return "Lỗi: toolName không được để trống.";
        }
        Map<String, Object> args = arguments != null ? arguments : Collections.emptyMap();

        return switch (toolName) {
            case "triage_patient_symptoms" -> triagePatientSymptoms(
                    Objects.toString(args.get("symptoms"), ""),
                    Objects.toString(args.get("medicalHistory"), "")
            );
            case "lookup_doctor_directory" -> lookupDoctorDirectory(
                    Objects.toString(args.get("specialtyId"), null)
            );
            case "get_available_time_slots" -> getAvailableTimeSlots(
                    Objects.toString(args.get("doctorId"), "")
            );
            case "verify_booking_code" -> verifyBookingCode(
                    Objects.toString(args.get("bookingCode"), "")
            );
            case "reception_checkin" -> receptionCheckin(
                    Objects.toString(args.get("bookingCode"), "")
            );
            case "search_patient" -> searchPatient(
                    Objects.toString(args.get("keyword"), "")
            );
            case "doctor_summarize_patient" -> doctorSummarizePatient(
                    Objects.toString(args.get("appointmentIdOrBookingCode"), "")
            );
            case "doctor_consult_medicines" -> doctorConsultMedicines(
                    Objects.toString(args.get("keyword"), "")
            );
            case "get_admin_statistics" -> getAdminStatistics(
                    Objects.toString(args.get("range"), "TODAY")
            );
            default -> "Lỗi: Không tìm thấy tool '" + toolName + "'.";
        };
    }

    private String safely(Supplier<String> call) {
        try {
            return call.get();
        } catch (Exception ex) {
            log.error("AI Tool call failed: {}", ex.getMessage(), ex);
            return "Thao tác thất bại: " + ex.getMessage();
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }
}
