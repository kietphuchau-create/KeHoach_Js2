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
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
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

        // ── Kiểm tra tránh bệnh nhân đặt trùng giờ 2 bác sĩ ──────────
        validatePatientNotDoubleBooked(command.patientProfileId(), slot);

        boolean locked = timeSlotRepository.lockSlot(command.slotId());
        if (!locked) {
            throw new SlotNotAvailableException("Không thể giữ chỗ slot khám (xung đột đồng thời)");
        }

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
    }

    /**
     * Kiểm tra khung giờ khám có nằm trong giờ hành chính (8:00 – 17:00, Thứ Hai – Thứ Sáu)
     * theo múi giờ Việt Nam hay không. Từ chối đặt lịch nếu slot đã qua hoặc rơi vào
     * cuối tuần / ngoài giờ làm việc.
     */
    private void validateBusinessHours(TimeSlot slot) {
        ZonedDateTime slotStart = slot.startTime().atZone(VN_ZONE);

        // 1. Không cho đặt slot đã ở quá khứ
        if (slotStart.toInstant().isBefore(Instant.now())) {
            throw new SlotNotAvailableException(
                    "Không thể đặt lịch khám cho khung giờ đã qua. Vui lòng chọn khung giờ trong tương lai.");
        }

        // 2. Không cho đặt vào Thứ Bảy / Chủ Nhật
        DayOfWeek day = slotStart.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
            throw new SlotNotAvailableException(
                    "Phòng khám không làm việc vào cuối tuần (Thứ Bảy & Chủ Nhật). "
                    + "Vui lòng chọn ngày khám từ Thứ Hai đến Thứ Sáu.");
        }

        // 3. Khung giờ phải nằm trong 8:00 – 17:00
        LocalTime slotTime = slotStart.toLocalTime();
        if (slotTime.isBefore(BUSINESS_START) || slotTime.isAfter(BUSINESS_END.minusMinutes(1))) {
            throw new SlotNotAvailableException(
                    "Khung giờ khám phải nằm trong giờ hành chính (08:00 – 17:00). "
                    + "Vui lòng chọn khung giờ phù hợp.");
        }
    }

    /**
     * Ngăn chặn bệnh nhân đặt trùng lịch: Bệnh nhân không được phép có hai ca khám
     * đang kích hoạt (PENDING, CONFIRMED, CHECKED_IN) có khung giờ khám chồng chéo nhau.
     */
    private void validatePatientNotDoubleBooked(String patientProfileId, TimeSlot targetSlot) {
        if (patientProfileId == null || patientProfileId.isBlank() || targetSlot.startTime() == null || targetSlot.endTime() == null) {
            return;
        }

        List<Appointment> existingApps = appointmentRepository.findByPatientProfileId(patientProfileId);
        if (existingApps == null || existingApps.isEmpty()) {
            return;
        }

        for (Appointment existing : existingApps) {
            String status = existing.status();
            boolean isActive = "PENDING".equalsIgnoreCase(status)
                    || "CONFIRMED".equalsIgnoreCase(status)
                    || "CHECKED_IN".equalsIgnoreCase(status);

            if (!isActive || existing.slotId() == null || existing.slotId().isBlank()) {
                continue;
            }

            // Trùng chính xác slot ID
            if (existing.slotId().equals(targetSlot.id())) {
                throw new SlotNotAvailableException(
                        "Bạn đã có một lịch hẹn (Mã: " + existing.bookingCode()
                        + ") tại đúng khung giờ này. Không thể đặt trùng lặp!");
            }

            // Kiểm tra khung giờ của ca khám trước có chồng lấn với slot đang chọn không
            Optional<TimeSlot> existingSlotOpt = timeSlotRepository.findById(existing.slotId());
            if (existingSlotOpt.isPresent()) {
                TimeSlot existingSlot = existingSlotOpt.get();
                if (existingSlot.startTime() != null && existingSlot.endTime() != null) {
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
