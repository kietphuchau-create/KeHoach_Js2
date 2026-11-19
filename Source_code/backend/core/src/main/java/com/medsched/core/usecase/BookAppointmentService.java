package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.exception.SlotNotAvailableException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.domain.model.TimeSlot;
import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

public class BookAppointmentService implements BookAppointmentUseCase {

    /** Múi giờ Việt Nam (UTC+7) */
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    /** Giờ bắt đầu hành chính */
    private static final LocalTime BUSINESS_START = LocalTime.of(8, 0);
    /** Giờ kết thúc hành chính */
    private static final LocalTime BUSINESS_END = LocalTime.of(17, 0);

    private final AppointmentRepositoryPort appointmentRepository;
    private final TimeSlotRepositoryPort timeSlotRepository;
    private final AiTriagePort aiTriagePort;

    private static volatile java.util.function.BooleanSupplier devModeSupplier = () -> false;

    public static void setDevModeSupplier(java.util.function.BooleanSupplier supplier) {
        devModeSupplier = supplier != null ? supplier : () -> false;
    }

    public static boolean isDevModeActive() {
        return devModeSupplier != null && devModeSupplier.getAsBoolean();
    }

    public BookAppointmentService(
            AppointmentRepositoryPort appointmentRepository,
            TimeSlotRepositoryPort timeSlotRepository,
            AiTriagePort aiTriagePort
    ) {
        this.appointmentRepository = appointmentRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.aiTriagePort = aiTriagePort;
    }

    @Override
    public Appointment book(Command command) {
        TimeSlot slot = timeSlotRepository.findById(command.slotId())
                .orElseThrow(() -> new ResourceNotFoundException("Khung giờ khám không tồn tại: " + command.slotId()));

        if (!slot.isAvailable()) {
            throw new SlotNotAvailableException("Khung giờ này đã có người đặt trước hoặc tạm khóa");
        }

        // ── Kiểm tra giờ hành chính ──────────────────────────────────
        validateBusinessHours(slot);

        // ── Kiểm tra tránh bệnh nhân đặt trùng giờ 2 bác sĩ & chống spam ──────────
        validatePatientNotDoubleBooked(command.patientProfileId(), command.doctorId(), slot, command.symptoms());

        boolean locked = timeSlotRepository.lockSlot(command.slotId());
        if (!locked) {
            throw new SlotNotAvailableException("Không thể giữ chỗ slot khám (xung đột đồng thời)");
        }

        try {
            String aiSummary = null;
            if (aiTriagePort != null && command.symptoms() != null && !command.symptoms().isBlank()) {
                aiSummary = aiTriagePort.generateClinicalSummary(command.symptoms(), command.medicalHistory());
            }

            String id = UUID.randomUUID().toString();
            String bookingCode = "MED" + (100000 + ThreadLocalRandom.current().nextInt(900000));
            LocalDate todayVn = LocalDate.now(VN_ZONE);
            Instant startOfDay = todayVn.atStartOfDay(VN_ZONE).toInstant();
            Instant endOfDay = todayVn.plusDays(1).atStartOfDay(VN_ZONE).toInstant();
            long nextSeq = appointmentRepository.countByDoctorIdAndCreatedAtBetween(command.doctorId(), startOfDay, endOfDay) + 1;
            String queueNumber = String.format("APP-%03d", nextSeq);

            Appointment appointment = Appointment.createNew(
                    id,
                    bookingCode,
                    command.medicalCenterId(),
                    command.patientProfileId(),
                    command.doctorId(),
                    command.slotId(),
                    queueNumber,
                    command.symptoms(),
                    aiSummary
            );

            return appointmentRepository.save(appointment);
        } catch (Exception ex) {
            timeSlotRepository.releaseSlot(command.slotId());
            throw ex;
        }
    }

    /**
     * Kiểm tra khung giờ khám có hợp lệ hay không.
     * - Từ chối nếu slot đã ở quá khứ (trừ trường hợp kiểm thử chế độ Develop 24/7).
     * - Nếu slot thuộc ca trực chính thức của bác sĩ (doctorScheduleId != null) hoặc đang bật Chế Độ 24/7:
     *   Cho phép đặt theo đúng ca trực được hệ thống phê duyệt (hỗ trợ ca ngoài giờ 24/7 & ca trực cuối tuần).
     * - Nếu slot không gắn với ca trực: áp dụng giờ hành chính tiêu chuẩn (08:00 – 17:00, Thứ Hai – Thứ Sáu).
     */
    private void validateBusinessHours(TimeSlot slot) {
        ZonedDateTime slotStart = slot.startTime().atZone(VN_ZONE);
        boolean isDev247 = isDevModeActive();

        // 1. Không cho đặt slot đã ở quá khứ (ngoại trừ khi chế độ Dev 24/7 đang kích hoạt để kiểm thử)
        if (!isDev247 && slotStart.toInstant().isBefore(Instant.now())) {
            throw new SlotNotAvailableException(
                    "Không thể đặt lịch khám cho khung giờ đã qua. Vui lòng chọn khung giờ trong tương lai.");
        }

        // 2. Cho phép đặt ca trực hợp lệ của bác sĩ (bao gồm ca 24/7 & cuối tuần do Admin/Bác sĩ đăng ký)
        if (isDev247 || (slot.doctorScheduleId() != null && !slot.doctorScheduleId().isBlank())) {
            return;
        }

        // 3. Fallback cho slot vãng lai không gắn ca trực cụ thể: áp dụng giờ hành chính tiêu chuẩn
        DayOfWeek day = slotStart.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
            throw new SlotNotAvailableException(
                    "Phòng khám không làm việc vào cuối tuần (Thứ Bảy & Chủ Nhật). "
                    + "Vui lòng chọn ngày khám từ Thứ Hai đến Thứ Sáu.");
        }

        LocalTime slotTime = slotStart.toLocalTime();
        if (slotTime.isBefore(BUSINESS_START) || slotTime.isAfter(BUSINESS_END.minusMinutes(1))) {
            throw new SlotNotAvailableException(
                    "Khung giờ khám phải nằm trong giờ hành chính (08:00 – 17:00). "
                    + "Vui lòng chọn khung giờ phù hợp.");
        }
    }

    /**
     * Ngăn chặn bệnh nhân đặt trùng lịch, chống spam giữ chỗ ảo và kiểm soát tần suất khám:
     * 1. Không được đặt trùng chính xác cùng 1 slot_id (khung giờ đã được giữ chỗ).
     * 2. Không được đặt lại cùng một Bác sĩ đã khám (COMPLETED) hoặc đang chờ khám (PENDING/CONFIRMED/CHECKED_IN) trong vòng 1 ngày:
     *    - Áp dụng cho cùng một đối tượng người khám (Bản thân hoặc cùng 1 Người Thân).
     *    - Khám xong với Bác sĩ A thì được đặt tiếp với Bác sĩ B trong cùng ngày, nhưng không được khám 2 lần với BS A.
     * 3. Ràng buộc số ca khám đang hoạt động (ACTIVE: PENDING, CONFIRMED, CHECKED_IN) đồng thời trong ngày:
     *    - Bản thân: Tối đa 01 ca active trong ngày.
     *    - Người Thân: Tối đa 02 ca active trong ngày trên toàn bộ tài khoản.
     *    - Khi ca cũ hoàn tất khám (COMPLETED) hoặc bị hủy (CANCELLED): Không còn tính vào quota active, được phép đặt tiếp ngay lập tức.
     * 4. Không được đặt hai ca khám có khung giờ bị chồng lấn (Time Overlap) cho cùng một người.
     */
    private void validatePatientNotDoubleBooked(String patientProfileId, String targetDoctorId, TimeSlot targetSlot, String currentSymptoms) {
        if (patientProfileId == null || patientProfileId.isBlank() || targetSlot.startTime() == null || targetSlot.endTime() == null) {
            return;
        }

        List<Appointment> existingApps = appointmentRepository.findByPatientProfileId(patientProfileId);
        if (existingApps == null || existingApps.isEmpty()) {
            return;
        }

        LocalDate targetDate = targetSlot.startTime().atZone(VN_ZONE).toLocalDate();
        String targetDateStr = targetDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        boolean isCurrentRelative = isRelativeAppointment(currentSymptoms);
        String currentRelativeKey = extractRelativeKey(currentSymptoms);

        List<Appointment> sameDayActiveSelfApps = new ArrayList<>();
        List<Appointment> sameDayActiveRelativeApps = new ArrayList<>();

        for (Appointment existing : existingApps) {
            String status = existing.status() != null ? existing.status().toUpperCase() : "";
            boolean isActive = "PENDING".equals(status) || "CONFIRMED".equals(status) || "CHECKED_IN".equals(status);
            boolean isCompleted = "COMPLETED".equals(status);

            if (existing.slotId() == null || existing.slotId().isBlank()) {
                continue;
            }

            // 1. Trùng chính xác slot ID (bất kể ai, slot đã được đặt thì không thể đặt lặp lại)
            if (existing.slotId().equals(targetSlot.id())) {
                throw new SlotNotAvailableException(
                        "Bạn đã có một lịch hẹn (Mã: " + existing.bookingCode()
                        + ") tại đúng khung giờ này. Không thể đặt trùng lặp!");
            }

            // Chỉ xét các ca có liên quan trong cùng ngày: Active hoặc Completed
            if (!isActive && !isCompleted) {
                continue;
            }

            // Xác định ngày và giờ của ca khám trước (ưu tiên tra cứu time_slots, fallback qua createdAt)
            LocalDate existingDate = null;
            LocalTime existingStartTime = null;
            Instant existingStartInstant = null;
            Instant existingEndInstant = null;

            Optional<TimeSlot> existingSlotOpt = timeSlotRepository.findById(existing.slotId());
            if (existingSlotOpt.isPresent() && existingSlotOpt.get().startTime() != null && existingSlotOpt.get().endTime() != null) {
                TimeSlot s = existingSlotOpt.get();
                existingDate = s.startTime().atZone(VN_ZONE).toLocalDate();
                existingStartTime = s.startTime().atZone(VN_ZONE).toLocalTime();
                existingStartInstant = s.startTime();
                existingEndInstant = s.endTime();
            } else if (existing.createdAt() != null) {
                existingDate = existing.createdAt().atZone(VN_ZONE).toLocalDate();
                existingStartTime = existing.createdAt().atZone(VN_ZONE).toLocalTime();
            }

            if (existingDate == null || !targetDate.equals(existingDate)) {
                continue;
            }

            boolean isExistingRelative = isRelativeAppointment(existing.patientSymptoms());
            String existingRelativeKey = extractRelativeKey(existing.patientSymptoms());

            // Phân biệt cùng đối tượng người khám:
            // - Đặt cho Bản Thân: cùng đối tượng khi ca khám trước là Bản Thân (!isExistingRelative)
            // - Đặt cho Người Thân: cùng đối tượng khi ca khám trước là Người Thân và khớp key người thân
            boolean isSamePatientSubject = (!isCurrentRelative && !isExistingRelative)
                    || (isCurrentRelative && isExistingRelative && currentRelativeKey.equals(existingRelativeKey));

            // 2. Kiểm soát theo từng người bệnh cụ thể (Bản thân hoặc cùng 1 Người Thân):
            if (isSamePatientSubject) {
                String personSubject = isCurrentRelative ? "Người thân này" : "Bạn";
                boolean isSameDoc = targetDoctorId != null && targetDoctorId.equals(existing.doctorId());

                // 2a. Nếu ca trước đã COMPLETED (khám xong): Không được đặt lại cùng Bác sĩ đó trong ngày
                if (isCompleted && isSameDoc) {
                    throw new SlotNotAvailableException(
                            personSubject + " đã hoàn tất ca khám mã #" + existing.bookingCode()
                            + " với Bác sĩ này trong ngày " + targetDateStr + ". "
                            + "Theo quy định y tế, mỗi người chỉ khám tối đa 1 lần/ngày với cùng một Bác sĩ. "
                            + "Vui lòng chọn Bác sĩ khác hoặc đặt lịch vào ngày tiếp theo!");
                }

                // 2b. Kiểm tra trùng lấn khung giờ (Time Overlap) cho cùng đối tượng khám
                if (isActive && existingStartInstant != null && existingEndInstant != null) {
                    boolean overlap = targetSlot.startTime().isBefore(existingEndInstant)
                            && targetSlot.endTime().isAfter(existingStartInstant);
                    if (overlap) {
                        throw new SlotNotAvailableException(
                                personSubject + " đã có lịch khám (Mã vé: " + existing.bookingCode()
                                + ") trong cùng khung giờ này. Không thể đặt đồng thời hai ca khám trùng giờ nhau!");
                    }
                }

                // 2c. Nếu ca trước đang ACTIVE (chờ khám): Mỗi người chỉ được giữ tối đa 1 ca active cùng lúc
                if (isActive) {
                    String timeStr = existingStartTime != null ? " (lúc " + existingStartTime + ")" : "";
                    if (isSameDoc) {
                        throw new SlotNotAvailableException(
                                personSubject + " đã có ca khám mã #" + existing.bookingCode()
                                + " vào ngày " + targetDateStr + timeStr
                                + " với Bác sĩ này đang chờ phục vụ. "
                                + "Vui lòng hoàn tất khám, đổi giờ hoặc hủy ca cũ trước khi đặt thêm!");
                    } else {
                        throw new SlotNotAvailableException(
                                personSubject + " đã có ca khám mã #" + existing.bookingCode()
                                + " vào ngày " + targetDateStr + timeStr
                                + " đang chờ phục vụ. "
                                + "Hệ thống giới hạn tối đa 1 ca chờ khám trong ngày cho mỗi người bệnh. "
                                + "Sau khi hoàn tất khám hoặc hủy ca cũ, bạn có thể tiếp tục đặt ca mới với Bác sĩ khác!");
                    }
                }
            }

            // Thu thập các ca ACTIVE trong ngày để kiểm tra quota
            if (isActive) {
                if (!isExistingRelative) {
                    sameDayActiveSelfApps.add(existing);
                } else {
                    sameDayActiveRelativeApps.add(existing);
                }
            }
        }

        // 4. Ràng buộc số ca khám đang hoạt động (ACTIVE) trong ngày:
        // A. Bản thân: Tối đa 1 ca active
        if (!isCurrentRelative && sameDayActiveSelfApps.size() >= 1) {
            Appointment existingSelf = sameDayActiveSelfApps.get(0);
            throw new SlotNotAvailableException(
                    "Bạn đang có 1 ca khám của bản thân mã #" + existingSelf.bookingCode()
                    + " trong ngày " + targetDateStr + " đang chờ phục vụ. "
                    + "Hệ thống giới hạn tối đa 1 ca chờ khám trong ngày cho bản thân. "
                    + "Sau khi Bác sĩ hoàn tất khám hoặc hủy ca cũ, bạn có thể tiếp tục đặt ca mới với Bác sĩ khác!");
        }

        // B. Người thân: Tối đa 2 ca active trên toàn tài khoản
        if (isCurrentRelative && sameDayActiveRelativeApps.size() >= 2) {
            throw new SlotNotAvailableException(
                    "Tài khoản của bạn đã đạt tối đa 2 ca khám cho Người Thân đang chờ phục vụ trong ngày " + targetDateStr + ". "
                    + "Hệ thống giới hạn tối đa 2 ca chờ khám cho người thân cùng ngày để tránh spam giữ chỗ. "
                    + "Sau khi hoàn tất khám hoặc hủy ca cũ, bạn có thể tiếp tục đặt thêm cho người thân!");
        }
    }

    private boolean isRelativeAppointment(String symptoms) {
        if (symptoms == null) return false;
        String trimmed = symptoms.trim();
        return trimmed.startsWith("[Khám cho người thân:")
                || trimmed.startsWith("[Kham cho nguoi than:")
                || trimmed.startsWith("[Khám cho người thân")
                || trimmed.startsWith("[Kham cho nguoi than");
    }

    private String extractRelativeKey(String symptoms) {
        if (symptoms == null) return "";
        String trimmed = symptoms.trim();
        int openIdx = trimmed.indexOf('[');
        int closeIdx = trimmed.indexOf(']');
        if (openIdx >= 0 && closeIdx > openIdx) {
            String bracketContent = trimmed.substring(openIdx, closeIdx + 1);
            if (bracketContent.contains("người thân") || bracketContent.contains("nguoi than")) {
                return bracketContent.toLowerCase().replaceAll("\\s+", " ").trim();
            }
        }
        return "";
    }
}
