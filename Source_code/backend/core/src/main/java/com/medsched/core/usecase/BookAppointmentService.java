package com.medsched.core.usecase;

import com.medsched.core.domain.exception.DomainException;
import com.medsched.core.domain.exception.ResourceNotFoundException;
import com.medsched.core.domain.exception.SlotNotAvailableException;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.domain.model.TimeSlot;
import com.medsched.core.port.in.BookAppointmentUseCase;
import com.medsched.core.port.out.AiTriagePort;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.core.port.out.TimeSlotRepositoryPort;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

public class BookAppointmentService implements BookAppointmentUseCase {

    private final AppointmentRepositoryPort appointmentRepository;
    private final TimeSlotRepositoryPort timeSlotRepository;
    private final AiTriagePort aiTriagePort;

    public BookAppointmentService(
            AppointmentRepositoryPort appointmentRepository,
            TimeSlotRepositoryPort timeSlotRepository,
            AiTriagePort aiTriagePort
    ) {
        this.appointmentRepository = appointmentRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.aiTriagePort = aiTriagePort;
    }

    @Override
    public Appointment book(Command command) {
        if (command == null) {
            throw new DomainException("Thông tin đặt lịch không hợp lệ");
        }
        if (command.slotId() == null || command.slotId().isBlank()) {
            throw new DomainException("Phải chọn khung giờ khám (slotId)");
        }

        // 1. Kiểm tra sự tồn tại của khung giờ
        TimeSlot slot = timeSlotRepository.findById(command.slotId())
                .orElseThrow(() -> new ResourceNotFoundException("Khung giờ khám không tồn tại: " + command.slotId()));

        // 2. Kiểm tra trạng thái khung giờ trước khi giữ chỗ
        if (!slot.isAvailable()) {
            throw new SlotNotAvailableException("Khung giờ này đã có người đặt trước hoặc tạm khóa");
        }

        // 3. Khóa lạc quan nguyên tử (Atomic Compare-and-Set) chống đặt trùng khi 2 bệnh nhân bấm cùng lúc
        boolean locked = timeSlotRepository.lockSlot(command.slotId());
        if (!locked) {
            throw new SlotNotAvailableException("Khung giờ này đã có người đặt trước hoặc tạm khóa");
        }

        // 4. Phân tích & tóm tắt sơ bộ triệu chứng qua AI (nếu có triệu chứng)
        String aiSummary = null;
        if (aiTriagePort != null && command.symptoms() != null && !command.symptoms().isBlank()) {
            aiSummary = aiTriagePort.generateClinicalSummary(command.symptoms(), command.medicalHistory());
        }

        // 5. Sinh mã đặt lịch và số thứ tự phòng khám
        String id = UUID.randomUUID().toString();
        String bookingCode = "MED" + (100000 + ThreadLocalRandom.current().nextInt(900000));
        String queueNumber = "APP-" + (1000 + ThreadLocalRandom.current().nextInt(9000));

        Appointment appointment = Appointment.createNew(
                id,
                bookingCode,
                command.medicalCenterId(),
                command.patientProfileId(),
                command.doctorId(),
                command.slotId(),
                queueNumber,
                command.symptoms(),
                aiSummary
        );

        return appointmentRepository.save(appointment);
    }
}
