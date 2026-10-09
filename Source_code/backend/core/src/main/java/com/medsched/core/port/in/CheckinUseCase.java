package com.medsched.core.port.in;

import com.medsched.core.domain.model.Appointment;

public interface CheckinUseCase {
    record CheckinResult(
            Appointment appointment,
            String queueNumber,
            String message
    ) {}

    CheckinResult checkinByQrCode(String bookingCode);
    CheckinResult checkinByCccd(String cccdNumber, String fullName);
}
