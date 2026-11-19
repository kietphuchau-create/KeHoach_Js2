package com.medsched.app.adapter.in.web;

import com.medsched.doctor.DoctorPrescriptionDtos;
import com.medsched.doctor.DoctorPrescriptionService;
import com.medsched.doctor.PrescriptionPdfService;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.security.AppUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REQ-RX-02: API tra cứu và xuất PDF đơn thuốc điện tử.
 * Hợp đồng giao tiếp chuẩn Chương 10 tài liệu đặc tả SRS.
 */
@RestController
@RequestMapping({"/api/v1/prescriptions", "/api/prescriptions"})
@RequiredArgsConstructor
public class PrescriptionController {

    private final DoctorPrescriptionService prescriptionService;
    private final PrescriptionPdfService pdfService;
    private final AppointmentJpaRepository appointmentJpaRepository;
    private final PatientProfileJpaRepository patientProfileJpaRepository;

    private void verifyPrescriptionAccess(String appointmentId, AppUserDetails principal) {
        if (principal == null) {
            throw new AccessDeniedException("Bạn cần đăng nhập để xem đơn thuốc.");
        }
        boolean isMedicalStaff = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())
                        || "ROLE_DOCTOR".equals(a.getAuthority())
                        || "ROLE_STAFF".equals(a.getAuthority()));
        if (isMedicalStaff) {
            return;
        }
        AppointmentEntity app = appointmentJpaRepository.findById(appointmentId)
                .or(() -> appointmentJpaRepository.findByBookingCode(appointmentId))
                .orElse(null);
        if (app == null || app.getPatientProfileId() == null) {
            throw new AccessDeniedException("Bạn không có quyền truy cập đơn thuốc này.");
        }
        boolean ownsProfile = patientProfileJpaRepository.findByUserId(principal.getUserId()).stream()
                .anyMatch(p -> p.getId().equals(app.getPatientProfileId()));
        if (!ownsProfile) {
            throw new AccessDeniedException("Bạn không có quyền xem đơn thuốc của bệnh nhân khác.");
        }
    }

    /**
     * Tra cứu chi tiết đơn thuốc điện tử theo ID ca khám hoặc mã đơn thuốc.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DoctorPrescriptionDtos.PrescriptionDetailDto> getPrescriptionDetails(
            @PathVariable("id") String id,
            @AuthenticationPrincipal AppUserDetails principal) {
        verifyPrescriptionAccess(id, principal);
        return ResponseEntity.ok(prescriptionService.getPrescriptionDetailsByAppointmentId(id));
    }

    /**
     * REQ-RX-02: Xuất file PDF đơn thuốc điện tử chuẩn hóa y tế để in hoặc tải về máy.
     */
    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadPrescriptionPdf(
            @PathVariable("id") String id,
            @AuthenticationPrincipal AppUserDetails principal) {
        verifyPrescriptionAccess(id, principal);
        byte[] pdfBytes = pdfService.generatePrescriptionPdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "don-thuoc-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }
}
