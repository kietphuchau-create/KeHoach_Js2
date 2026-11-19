package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.exception.SlotNotAvailableException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.domain.model.TimeSlot;
import com.medsched.core.port.in.RestoreAppointmentUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Nghiệp vụ Khôi phục ca khám đã hủy nhầm:
 * 1. Kiểm tra trạng thái ca khám phải là CANCELLED.
 * 2. Kiểm tra khung giờ khám (slot) còn ở tương lai.
 * 3. Kiểm tra quota ca active trong ngày của bệnh nhân.
 * 4. Khóa lại slot (lockSlot) trở về BOOKED.
 * 5. Chuyển trạng thái ca khám trở về CONFIRMED.
 */
public class RestoreAppointmentService implements RestoreAppointmentUseCase {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AppointmentRepositoryPort appointmentRepository;
    private final TimeSlotRepositoryPort timeSlotRepository;

    public RestoreAppointmentService(AppointmentRepositoryPort appointmentRepository,
                                   TimeSlotRepositoryPort timeSlotRepository) {
        this.appointmentRepository = appointmentRepository;
        this.timeSlotRepository = timeSlotRepository;
    }

    @Override
    public Appointment restore(Command command) {
        Appointment appointment = appointmentRepository.findById(command.appointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + command.appointmentId()));

        String status = appointment.status() != null ? appointment.status().toUpperCase() : "";
        if (!"CANCELLED".equals(status)) {
            // Nếu ca khám không ở trạng thái CANCELLED thì giữ nguyên
            return appointment;
        }

        if (appointment.slotId() == null || appointment.slotId().isBlank()) {
            throw new SlotNotAvailableException("Không thể khôi phục ca khám do thiếu thông tin khung giờ.");
        }

        // 1. Kiểm tra khung giờ khám có còn ở tương lai không
        TimeSlot slot = timeSlotRepository.findById(appointment.slotId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung giờ của ca khám này."));

        if (slot.startTime() != null && slot.startTime().isBefore(Instant.now())) {
            throw new SlotNotAvailableException("Không thể khôi phục ca khám đã qua khung giờ hẹn trong quá khứ.");
        }

        // 2. Kiểm tra quota: Người bệnh hiện tại đã có ca active khác trong ngày chưa
        if (appointment.patientProfileId() != null && slot.startTime() != null) {
            LocalDate targetDate = slot.startTime().atZone(VN_ZONE).toLocalDate();
            boolean isRelative = isRelativeAppointment(appointment.patientSymptoms());
            List<Appointment> existingApps = appointmentRepository.findByPatientProfileId(appointment.patientProfileId());

            if (existingApps != null) {
                int activeSelfCount = 0;
                int activeRelativeCount = 0;
                for (Appointment ex : existingApps) {
                    if (ex.id().equals(appointment.id())) continue;
                    String exStatus = ex.status() != null ? ex.status().toUpperCase() : "";
                    boolean isExActive = "PENDING".equals(exStatus) || "CONFIRMED".equals(exStatus) || "CHECKED_IN".equals(exStatus);
                    if (!isExActive || ex.slotId() == null) continue;

                    TimeSlot exSlot = timeSlotRepository.findById(ex.slotId()).orElse(null);
                    if (exSlot != null && exSlot.startTime() != null) {
                        LocalDate exDate = exSlot.startTime().atZone(VN_ZONE).toLocalDate();
                        if (targetDate.equals(exDate)) {
                            boolean isExRel = isRelativeAppointment(ex.patientSymptoms());
                            if (!isExRel) {
                                activeSelfCount++;
                            } else {
                                activeRelativeCount++;
                            }
                        }
                    }
                }

                if (!isRelative && activeSelfCount >= 1) {
                    throw new SlotNotAvailableException(
                            "Bạn đã có 1 ca khám khác đang chờ phục vụ trong ngày "
                            + targetDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            + ". Hệ thống giới hạn tối đa 1 ca chờ khám cho bản thân.");
                }
                if (isRelative && activeRelativeCount >= 2) {
                    throw new SlotNotAvailableException(
                            "Tài khoản đã có 2 ca khám cho Người Thân đang chờ phục vụ trong ngày "
                            + targetDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ".");
                }
            }
        }

        // 3. Khóa lại slot (Atomic lock)
        boolean locked = timeSlotRepository.lockSlot(appointment.slotId());
        if (!locked) {
            throw new SlotNotAvailableException(
                    "Khung giờ này đã được bệnh nhân khác đặt sau khi bạn hủy. "
                    + "Không thể khôi phục lại khung giờ ban đầu, vui lòng chọn khung giờ khác.");
        }

        // 4. Khôi phục ca khám về trạng thái CONFIRMED
        Appointment restored = appointment.restore("CONFIRMED");
        return appointmentRepository.save(restored);
    }

    private boolean isRelativeAppointment(String symptoms) {
        if (symptoms == null) return false;
        String trimmed = symptoms.trim();
        return trimmed.startsWith("[Khám cho người thân:")
                || trimmed.startsWith("[Kham cho nguoi than:")
                || trimmed.startsWith("[Khám cho người thân")
                || trimmed.startsWith("[Kham cho nguoi than");
    }
}
