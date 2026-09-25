package com.medsched.doctor;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class DoctorScheduleDtos {

    public record CreateScheduleRequest(
            String doctorId,
            @NotNull(message = "Ngày trực không được để trống") LocalDate workDate,
            @NotNull(message = "Giờ bắt đầu không được để trống") LocalTime startTime,
            @NotNull(message = "Giờ kết thúc không được để trống") LocalTime endTime,
            Integer slotDurationMinutes
    ) {}

    public record TimeSlotDto(
            String id,
            String scheduleId,
            String doctorId,
            String startTime,
            String endTime,
            String status
    ) {}

    public record DoctorScheduleDto(
            String id,
            String doctorId,
            LocalDate workDate,
            String startTime,
            String endTime,
            int slotDurationMinutes,
            String status,
            int totalSlots,
            int availableSlots,
            int bookedSlots,
            List<TimeSlotDto> slots
    ) {}
}
