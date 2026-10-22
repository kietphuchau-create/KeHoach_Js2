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
            Integer slotDurationMinutes,
            String roomNumber
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
            List<TimeSlotDto> slots,
            String roomNumber,
            String doctorName,
            String academicTitle,
            String specialtyName,
            String medicalCenterName
    ) {
        public DoctorScheduleDto(
                String id, String doctorId, LocalDate workDate, String startTime, String endTime,
                int slotDurationMinutes, String status, int totalSlots, int availableSlots,
                int bookedSlots, List<TimeSlotDto> slots, String roomNumber
        ) {
            this(id, doctorId, workDate, startTime, endTime, slotDurationMinutes, status, totalSlots, availableSlots, bookedSlots, slots, roomNumber, null, null, null, null);
        }
    }

    public record RoomOccupancyDto(
            String roomNumber,
            String doctorId,
            String doctorName,
            String startTime,
            String endTime,
            boolean isOccupied
    ) {}

    public record EmergencyCancelScheduleRequest(
            @jakarta.validation.constraints.NotBlank(message = "Lý do hủy ca trực không được để trống")
            @jakarta.validation.constraints.Size(min = 5, message = "Lý do hủy phải có tối thiểu 5 ký tự")
            String reason,
            boolean autoReassign
    ) {}

    public record AffectedPatientInfoDto(
            String appointmentId,
            String bookingCode,
            String patientName,
            String patientPhone,
            String slotTime,
            String status,
            String reassignedDoctorName
    ) {}

    public record EmergencyCancelResponse(
            String scheduleId,
            String workDate,
            int affectedCount,
            int reassignedCount,
            List<AffectedPatientInfoDto> affectedPatients,
            String message
    ) {}

    public record AutoScheduleResultDto(
            LocalDate workDate,
            int doctorsScheduledCount,
            int totalShiftsCreated,
            int totalSlotsCreated,
            String message
    ) {}

    public record ChangeScheduleRoomRequest(
            @jakarta.validation.constraints.NotBlank(message = "Buồng khám mới không được để trống")
            String newRoomNumber
    ) {}
}

