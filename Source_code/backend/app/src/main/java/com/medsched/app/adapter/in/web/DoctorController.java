package com.medsched.app.adapter.in.web;

import com.medsched.doctor.DoctorPrescriptionDtos;
import com.medsched.doctor.DoctorPrescriptionService;
import com.medsched.security.AppUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/doctor", "/api/doctor"})
@PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'STAFF')")
public class DoctorController {

    private final DoctorPrescriptionService doctorPrescriptionService;

    public DoctorController(DoctorPrescriptionService doctorPrescriptionService) {
        this.doctorPrescriptionService = doctorPrescriptionService;
    }

    /**
     * Lấy danh sách hàng đợi khám cho bác sĩ.
     */
    @GetMapping("/queue")
    public ResponseEntity<List<DoctorPrescriptionDtos.QueuePatientDto>> getQueue(
            @AuthenticationPrincipal AppUserDetails principal,
            @RequestParam(required = false) String doctorId) {

        String userId = principal != null ? principal.getUserId() : null;
        List<DoctorPrescriptionDtos.QueuePatientDto> queue =
                doctorPrescriptionService.getDoctorQueue(userId, doctorId);

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
}


