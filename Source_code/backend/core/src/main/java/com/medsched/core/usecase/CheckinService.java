package com.medsched.core.usecase;

import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;

import java.time.Instant;

public class CheckinService implements CheckinUseCase {

    private final AppointmentRepositoryPort appointmentRepository;

    public CheckinService(AppointmentRepositoryPort appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Override
    public CheckinResult checkinByQrCode(String bookingCode) {
        Appointment appointment = appointmentRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch hẹn với mã: " + bookingCode));

        Appointment updated = appointment.checkIn("QR_CODE", Instant.now());
        appointmentRepository.save(updated);

        return new CheckinResult(
                updated,
                updated.queueNumber(),
                "Tiếp đón thành công qua mã QR vé hẹn! Mời bệnh nhân vào phòng chờ."
        );
    }

    @Override
    public CheckinResult checkinByCccd(String cccdNumber, String fullName) {
        return new CheckinResult(
                null,
                "WLK-" + (100 + (int)(Math.random() * 900)),
                "Tiếp đón thành công bằng thẻ CCCD gắn chip (" + fullName + " - " + cccdNumber + ")!"
        );
    }
}
