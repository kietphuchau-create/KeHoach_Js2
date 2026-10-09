package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.CancelAppointmentUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;

/**
 * CLAB-105: Nghiệp vụ Hủy lịch khám & Giải phóng Time-slot.
 * <p>
 * Khi ca khám được hủy thành công:
 * 1. Trạng thái ca khám đổi sang CANCELLED.
 * 2. Khung giờ khám (slot_id) được giải phóng trở về trạng thái AVAILABLE để bệnh nhân khác đặt được ngay.
 * 3. Chặn không cho phép hủy các ca khám đã CHECKED_IN (đã tiếp đón tại quầy) hoặc COMPLETED (đã khám xong).
 */
public class CancelAppointmentService implements CancelAppointmentUseCase {

    private final AppointmentRepositoryPort appointmentRepository;
    private final TimeSlotRepositoryPort timeSlotRepository;

    public CancelAppointmentService(AppointmentRepositoryPort appointmentRepository,
                                  TimeSlotRepositoryPort timeSlotRepository) {
        this.appointmentRepository = appointmentRepository;
        this.timeSlotRepository = timeSlotRepository;
    }

    @Override
    public Appointment cancel(Command command) {
        Appointment appointment = appointmentRepository.findById(command.appointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ca khám: " + command.appointmentId()));

        String status = appointment.status();
        if ("CHECKED_IN".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status)) {
            throw new IllegalArgumentException("Ca khám đã tiếp đón tại quầy hoặc đã hoàn tất, không thể hủy.");
        }

        if ("CANCELLED".equalsIgnoreCase(status)) {
            return appointment;
        }

        // 1. Chuyển trạng thái ca khám sang CANCELLED
        Appointment cancelledAppointment = appointment.cancel();
        Appointment saved = appointmentRepository.save(cancelledAppointment);

        // 2. Giải phóng slot khám trở về AVAILABLE
        if (appointment.slotId() != null && !appointment.slotId().isBlank()) {
            timeSlotRepository.releaseSlot(appointment.slotId());
        }

        return saved;
    }

}
