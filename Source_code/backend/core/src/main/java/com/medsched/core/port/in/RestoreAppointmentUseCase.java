package com.medsched.core.port.in;

import com.medsched.core.domain.model.Appointment;

/**
 * Nghiệp vụ Khôi phục ca khám đã hủy nhầm:
 * - Dành cho bệnh nhân vô tình bấm hủy hoặc muốn lấy lại lịch hẹn cũ.
 * - Khóa lại slot khám (nếu còn AVAILABLE) và chuyển trạng thái về CONFIRMED.
 */
public interface RestoreAppointmentUseCase {

    record Command(
            String appointmentId
    ) {}

    Appointment restore(Command command);

}
