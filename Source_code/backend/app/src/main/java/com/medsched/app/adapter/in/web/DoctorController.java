package com.medsched.app.adapter.in.web;

import com.medsched.doctor.DoctorPrescriptionDtos;
import com.medsched.doctor.DoctorPrescriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/doctor", "/api/doctor"})
@PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
public class DoctorController {

    private final DoctorPrescriptionService doctorPrescriptionService;

    public DoctorController(DoctorPrescriptionService doctorPrescriptionService) {
        this.doctorPrescriptionService = doctorPrescriptionService;
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
}
