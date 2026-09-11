package com.medsched.core.port.in;

import com.medsched.core.domain.model.Appointment;

public interface BookAppointmentUseCase {
    record Command(
            String medicalCenterId,
            String patientProfileId,
            String doctorId,
            String slotId,
            String symptoms,
            String medicalHistory
    ) {}

    Appointment book(Command command);
}
