package com.medsched.core.usecase;

import com.medsched.core.domain.exception.DomainException;
import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;

import java.time.Instant;
import java.util.concurrent.ThreadLocalRandom;

public class CheckinService implements CheckinUseCase {

    private final AppointmentRepositoryPort appointmentRepository;

    public CheckinService(AppointmentRepositoryPort appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Override
    public CheckinResult checkinByQrCode(String bookingCode) {
        if (bookingCode == null || bookingCode.isBlank()) {
            throw new DomainException("Mã đặt lịch không được để trống");
        }

        Appointment appointment = appointmentRepository.findByBookingCode(bookingCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch hẹn với mã: " + bookingCode));

        // Kiểm tra nếu đã check-in trước đó rồi (idempotent, tránh lỗi khi máy quét bip 2 lần)
        if ("CHECKED_IN".equalsIgnoreCase(appointment.status())) {
            return CheckinResult.of(
                    appointment,
                    appointment.queueNumber(),
                    "Lịch hẹn đã được tiếp đón trước đó. Mời bệnh nhân vào phòng chờ."
            );
        }

        if ("CANCELLED".equalsIgnoreCase(appointment.status())) {
            throw new DomainException("Lịch hẹn này đã bị hủy, không thể tiếp đón");
        }

        Instant checkInTime = Instant.now();
        Appointment updated = appointment.checkIn("QR_CODE", checkInTime);
        Appointment saved = appointmentRepository.save(updated);

        return CheckinResult.of(
                saved,
                saved.queueNumber(),
                "Tiếp đón thành công qua mã QR vé hẹn! Mời bệnh nhân vào phòng chờ."
        );
    }

    @Override
    public CheckinResult checkinByCccd(String cccdNumber, String fullName) {
        if (cccdNumber == null || cccdNumber.isBlank()) {
            throw new DomainException("Số thẻ CCCD không được để trống");
        }

        String displayName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : "Bệnh nhân vãng lai";
        String queueNumber = "WLK-" + (100 + ThreadLocalRandom.current().nextInt(900));

        return new CheckinResult(
                null,
                queueNumber,
                "Tiếp đón thành công bằng thẻ CCCD gắn chip (" + displayName + " - " + cccdNumber.trim() + ")!",
                null,
                "WAITING",
                Instant.now()
        );
    }
}
