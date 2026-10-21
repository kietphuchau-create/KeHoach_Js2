package com.medsched.core.port.in;

import com.medsched.core.domain.model.Appointment;

public interface CancelAppointmentUseCase {

    record Command(
            String appointmentId,
            String reason
    ) {}

    Appointment cancel(Command command);

}
