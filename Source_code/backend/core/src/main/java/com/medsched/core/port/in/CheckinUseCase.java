package com.medsched.core.port.in;

import com.medsched.core.domain.model.Appointment;

import java.time.Instant;

public interface CheckinUseCase {
    record CheckinResult(
            Appointment appointment,
            String queueNumber,
            String message,
            String bookingCode,
            String status,
            Instant checkInTime
    ) {
        public static CheckinResult of(Appointment app, String queueNumber, String message) {
            return new CheckinResult(
                    app,
                    queueNumber,
                    message,
                    app != null ? app.bookingCode() : null,
                    app != null ? app.status() : "CHECKED_IN",
                    app != null ? app.checkInTime() : Instant.now()
            );
        }
    }

    CheckinResult checkinByQrCode(String bookingCode);
    CheckinResult checkinByCccd(String cccdNumber, String fullName);
}
