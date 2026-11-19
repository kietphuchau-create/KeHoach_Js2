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
        validatePatientNotDoubleBooked(command.patientProfileId(), command.doctorId(), slot);

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
     * Ngăn chặn bệnh nhân đặt trùng lịch và chống spam giữ chỗ ảo (Phương án 1):
     * 1. Không được đặt trùng chính xác cùng 1 slot_id.
     * 2. Không được đặt hai ca khám có khung giờ bị chồng lấn lên nhau (Time Overlap).
     * 3. Ràng buộc cứng chống spam (CLAB-174): Mỗi bệnh nhân chỉ được phép có tối đa 01 ca khám đang hoạt động
     *    (PENDING, CONFIRMED, CHECKED_IN) trong cùng một ngày (workDate). Muốn đổi giờ phải dùng chức năng Đổi lịch hoặc hủy ca cũ.
     *    Tuyệt đối không cho phép đặt nhiều ca trong ngày dù cùng bác sĩ hay khác bác sĩ.
     */
    private void validatePatientNotDoubleBooked(String patientProfileId, String targetDoctorId, TimeSlot targetSlot) {
        if (patientProfileId == null || patientProfileId.isBlank() || targetSlot.startTime() == null || targetSlot.endTime() == null) {
            return;
        }

        List<Appointment> existingApps = appointmentRepository.findByPatientProfileId(patientProfileId);
        if (existingApps == null || existingApps.isEmpty()) {
            return;
        }

        LocalDate targetDate = targetSlot.startTime().atZone(VN_ZONE).toLocalDate();

        for (Appointment existing : existingApps) {
            String status = existing.status();
            boolean isActive = "PENDING".equalsIgnoreCase(status)
                    || "CONFIRMED".equalsIgnoreCase(status)
                    || "CHECKED_IN".equalsIgnoreCase(status);

            if (!isActive || existing.slotId() == null || existing.slotId().isBlank()) {
                continue;
            }

            // 1. Trùng chính xác slot ID
            if (existing.slotId().equals(targetSlot.id())) {
                throw new SlotNotAvailableException(
                        "Bạn đã có một lịch hẹn (Mã: " + existing.bookingCode()
                        + ") tại đúng khung giờ này. Không thể đặt trùng lặp!");
            }

            // 2. Xác định ngày và giờ của ca khám trước (ưu tiên tra cứu time_slots, fallback qua createdAt)
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

            if (existingDate != null && targetDate.equals(existingDate)) {
                String timeStr = existingStartTime != null ? existingStartTime.toString() : null;
                boolean isSameDoc = targetDoctorId != null && targetDoctorId.equals(existing.doctorId());

                if (isSameDoc) {
                    throw new SlotNotAvailableException(
                            "Bạn đã có ca khám mã #" + existing.bookingCode()
                            + " vào ngày " + targetDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            + (timeStr != null ? " (lúc " + timeStr + ")" : "")
                            + " với Bác sĩ này đang chờ phục vụ. "
                            + "Vui lòng hoàn tất khám, đổi giờ hoặc hủy ca cũ trước khi đặt thêm!");
                }
            }

            // 3. Kiểm tra trùng lấn khung giờ (Time Overlap)
            if (existingStartInstant != null && existingEndInstant != null) {
                boolean overlap = targetSlot.startTime().isBefore(existingEndInstant)
                        && targetSlot.endTime().isAfter(existingStartInstant);
                if (overlap) {
                    throw new SlotNotAvailableException(
                            "Bạn đã có lịch khám (Mã vé: " + existing.bookingCode()
                            + ") trong cùng khung giờ này. Không thể đặt đồng thời hai ca khám trùng giờ nhau!");
                }
            }
        }
    }
}
