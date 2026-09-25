package com.medsched.app.adapter.in.web;

import com.medsched.doctor.DoctorPrescriptionDtos;
import com.medsched.doctor.DoctorPrescriptionService;
import com.medsched.security.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import com.medsched.doctor.DoctorScheduleDtos;
import com.medsched.doctor.DoctorScheduleService;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/doctor", "/api/doctor"})
@PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'STAFF')")
public class DoctorController {

    private final DoctorPrescriptionService doctorPrescriptionService;
    private final DoctorScheduleService doctorScheduleService;

    public DoctorController(DoctorPrescriptionService doctorPrescriptionService,
                            DoctorScheduleService doctorScheduleService) {
        this.doctorPrescriptionService = doctorPrescriptionService;
        this.doctorScheduleService = doctorScheduleService;
    }

    /**
     * Lấy danh sách hàng đợi khám cho bác sĩ theo ngày (mặc định hôm nay).
     */
    @GetMapping("/queue")
    public ResponseEntity<List<DoctorPrescriptionDtos.QueuePatientDto>> getQueue(
            @AuthenticationPrincipal AppUserDetails principal,
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        String userId = principal != null ? principal.getUserId() : null;
        List<DoctorPrescriptionDtos.QueuePatientDto> queue =
                doctorPrescriptionService.getDoctorQueue(userId, doctorId, date);

        return ResponseEntity.ok(queue);
    }

    /**
     * CLAB-107: Bác sĩ hoàn tất khám & kê đơn thuốc điện tử.
     * Trả về HTTP 201 Created cùng thông tin đơn thuốc và tổng tiền thuốc.
     */
    @PostMapping("/appointments/{appointmentId}/prescriptions")
    public ResponseEntity<DoctorPrescriptionDtos.PrescriptionResponse> createPrescription(
            @PathVariable String appointmentId,
            @Valid @RequestBody DoctorPrescriptionDtos.CreatePrescriptionRequest request) {

        DoctorPrescriptionDtos.PrescriptionResponse response =
                doctorPrescriptionService.completeConsultation(appointmentId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Bác sĩ tiếp nhận nhanh ca khám (chuyển sang CHECKED_IN).
     */
    @PostMapping("/appointments/{appointmentId}/admit")
    public ResponseEntity<Void> admitPatient(@PathVariable String appointmentId) {
        doctorPrescriptionService.admitPatient(appointmentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Bác sĩ gọi bệnh nhân vào phòng khám (chuyển sang IN_PROGRESS).
     */
    @PostMapping("/appointments/{appointmentId}/call")
    public ResponseEntity<Void> callPatientToRoom(@PathVariable String appointmentId) {
        doctorPrescriptionService.callPatientToRoom(appointmentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Bác sĩ tạm hoãn ca khám (chuyển sang WAITING_FOR_LAB_RESULTS).
     */
    @PostMapping("/appointments/{appointmentId}/defer")
    public ResponseEntity<Void> deferPatient(@PathVariable String appointmentId) {
        doctorPrescriptionService.deferPatient(appointmentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Bác sĩ gửi bệnh nhân đi làm cận lâm sàng / xét nghiệm (chuyển sang WAITING_FOR_LAB_RESULTS).
     */
    @PostMapping("/appointments/{appointmentId}/lab")
    public ResponseEntity<Void> sendToLab(@PathVariable String appointmentId) {
        doctorPrescriptionService.deferPatient(appointmentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Bác sĩ đánh dấu bệnh nhân vắng mặt khi gọi loa (chuyển sang MISSED_NO_SHOW).
     */
    @PostMapping("/appointments/{appointmentId}/miss")
    public ResponseEntity<Void> missPatient(@PathVariable String appointmentId) {
        doctorPrescriptionService.missPatient(appointmentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Tra cứu chi tiết kết quả khám & đơn thuốc điện tử.
     */
    @GetMapping("/appointments/{appointmentId}/prescription")
    public ResponseEntity<DoctorPrescriptionDtos.PrescriptionDetailDto> getPrescriptionDetails(
            @PathVariable String appointmentId) {
        DoctorPrescriptionDtos.PrescriptionDetailDto response =
                doctorPrescriptionService.getPrescriptionDetailsByAppointmentId(appointmentId);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy danh sách ca trực & các khung giờ (TimeSlots) của bác sĩ.
     */
    @GetMapping("/schedules")
    public ResponseEntity<List<DoctorScheduleDtos.DoctorScheduleDto>> getSchedules(
            @AuthenticationPrincipal AppUserDetails principal,
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        String userId = principal != null ? principal.getUserId() : null;
        List<DoctorScheduleDtos.DoctorScheduleDto> schedules =
                doctorScheduleService.getDoctorSchedules(userId, doctorId, from, to);
        return ResponseEntity.ok(schedules);
    }

    /**
     * Bác sĩ đăng ký ca trực mới (tự động sinh các slot 30 phút).
     */
    @PostMapping("/schedules")
    public ResponseEntity<DoctorScheduleDtos.DoctorScheduleDto> createSchedule(
            @AuthenticationPrincipal AppUserDetails principal,
            @Valid @RequestBody DoctorScheduleDtos.CreateScheduleRequest request) {

        String userId = principal != null ? principal.getUserId() : null;
        DoctorScheduleDtos.DoctorScheduleDto schedule =
                doctorScheduleService.createSchedule(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(schedule);
    }

    /**
     * Bác sĩ khóa/mở khung giờ khám (AVAILABLE <-> LOCKED).
     */
    @PatchMapping("/slots/{slotId}/toggle-lock")
    public ResponseEntity<DoctorScheduleDtos.TimeSlotDto> toggleSlot(
            @PathVariable String slotId) {
        DoctorScheduleDtos.TimeSlotDto updated = doctorScheduleService.toggleSlotStatus(slotId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Bác sĩ hủy ca trực (chỉ cho phép khi chưa có bệnh nhân đặt lịch).
     */
    @DeleteMapping("/schedules/{scheduleId}")
    public ResponseEntity<Void> deleteSchedule(
            @PathVariable String scheduleId) {
        doctorScheduleService.deleteSchedule(scheduleId);
        return ResponseEntity.noContent().build();
    }
}


