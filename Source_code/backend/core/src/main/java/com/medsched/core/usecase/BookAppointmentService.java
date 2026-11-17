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
            String queueNumber = "APP-" + (1000 + ThreadLocalRandom.current().nextInt(9000));

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
     * - Từ chối nếu slot đã ở quá khứ.
     * - Nếu slot thuộc ca trực chính thức của bác sĩ (doctorScheduleId != null):
     *   Cho phép đặt theo đúng ca trực được hệ thống phê duyệt (hỗ trợ ca ngoài giờ 24/7 & ca trực cuối tuần).
     * - Nếu slot không gắn với ca trực: áp dụng giờ hành chính tiêu chuẩn (08:00 – 17:00, Thứ Hai – Thứ Sáu).
     */
    private void validateBusinessHours(TimeSlot slot) {
        ZonedDateTime slotStart = slot.startTime().atZone(VN_ZONE);

        // 1. Không cho đặt slot đã ở quá khứ
        if (slotStart.toInstant().isBefore(Instant.now())) {
            throw new SlotNotAvailableException(
                    "Không thể đặt lịch khám cho khung giờ đã qua. Vui lòng chọn khung giờ trong tương lai.");
        }

        // 2. Cho phép đặt ca trực hợp lệ của bác sĩ (bao gồm ca 24/7 & cuối tuần do Admin/Bác sĩ đăng ký)
        if (slot.doctorScheduleId() != null && !slot.doctorScheduleId().isBlank()) {
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
     * Ngăn chặn bệnh nhân đặt trùng lịch và chống spam giữ chỗ ảo:
     * 1. Không được đặt trùng chính xác cùng 1 slot_id.
     * 2. Không được đặt hai ca khám có khung giờ bị chồng lấn lên nhau (Time Overlap).
     * 3. Chống spam cùng bác sĩ: Trong cùng một ngày (workDate), mỗi bệnh nhân chỉ được phép có tối đa 01 ca khám đang hoạt động
     *    (PENDING, CONFIRMED, CHECKED_IN) với cùng một Bác sĩ. Muốn đổi giờ phải dùng chức năng Đổi lịch hoặc hủy ca cũ.
     * 4. Chống spam tài nguyên hệ thống: Giới hạn tối đa 2 ca khám đang chờ trong cùng một ngày cho các chuyên khoa khác nhau.
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
        int activeCountSameDay = 0;

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

            // 2. Kiểm tra khung giờ của ca khám trước
            Optional<TimeSlot> existingSlotOpt = timeSlotRepository.findById(existing.slotId());
            if (existingSlotOpt.isPresent()) {
                TimeSlot existingSlot = existingSlotOpt.get();
                if (existingSlot.startTime() != null && existingSlot.endTime() != null) {
                    LocalDate existingDate = existingSlot.startTime().atZone(VN_ZONE).toLocalDate();

                    if (targetDate.equals(existingDate)) {
                        activeCountSameDay++;

                        // 3. Chống spam với cùng một Bác sĩ trong cùng ngày
                        if (targetDoctorId != null && targetDoctorId.equals(existing.doctorId())) {
                            String timeStr = existingSlot.startTime().atZone(VN_ZONE).toLocalTime().toString();
                            throw new SlotNotAvailableException(
                                    "Bạn đã có ca khám mã #" + existing.bookingCode()
                                    + " vào ngày " + targetDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                                    + " (lúc " + timeStr + ") với Bác sĩ này đang chờ phục vụ. "
                                    + "Để tránh chiếm giữ chỗ ảo (spam lịch), bạn không thể đặt thêm khung giờ khác với cùng Bác sĩ trong ngày. "
                                    + "Vui lòng hoàn tất khám, đổi giờ hoặc hủy ca cũ trước khi đặt thêm!");
                        }

                        // 4. Chống spam tài nguyên hệ thống (tối đa 2 ca đang chờ trong 1 ngày)
                        if (activeCountSameDay >= 2) {
                            throw new SlotNotAvailableException(
                                    "Bạn hiện đã có " + activeCountSameDay + " ca khám đang chờ trong ngày "
                                    + targetDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ". "
                                    + "Để đảm bảo cơ hội cho mọi bệnh nhân, hệ thống giới hạn tối đa 2 ca khám đang chờ trong cùng một ngày. "
                                    + "Vui lòng hoàn tất khám hoặc hủy ca cũ trước khi đặt thêm!");
                        }
                    }

                    // 5. Kiểm tra trùng lấn khung giờ (Time Overlap)
                    boolean overlap = targetSlot.startTime().isBefore(existingSlot.endTime())
                            && targetSlot.endTime().isAfter(existingSlot.startTime());
                    if (overlap) {
                        throw new SlotNotAvailableException(
                                "Bạn đã có lịch khám (Mã vé: " + existing.bookingCode()
                                + ") trong cùng khung giờ này. Không thể đặt đồng thời hai ca khám trùng giờ nhau!");
                    }
                }
            }
        }
    }
}
