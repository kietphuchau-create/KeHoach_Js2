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
        if (bookingCode == null || bookingCode.trim().isEmpty()) {
            throw new com.medsched.core.domain.exception.DomainException("Mã đặt lịch không được để trống");
        }
        Appointment appointment = appointmentRepository.findByBookingCode(bookingCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch hẹn với mã: " + bookingCode));

        if ("CHECKED_IN".equalsIgnoreCase(appointment.status())) {
            return new CheckinResult(
                    appointment,
                    appointment.queueNumber(),
                    "Lịch hẹn này đã được tiếp đón trước đó! Bệnh nhân đang trong hàng đợi."
            );
        }

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
        if (cccdNumber == null || cccdNumber.trim().isEmpty()) {
            throw new com.medsched.core.domain.exception.DomainException("Số thẻ CCCD không được để trống");
        }
        return new CheckinResult(
                null,
                "WLK-" + (100 + (int)(Math.random() * 900)),
                "Tiếp đón thành công bằng thẻ CCCD gắn chip (" + fullName + " - " + cccdNumber + ")!"
        );
    }
}
