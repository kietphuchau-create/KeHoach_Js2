package com.medsched.app.adapter.in.web;

import com.medsched.billing.BillingDtos;
import com.medsched.billing.BillingService;
import com.medsched.core.port.in.CheckinUseCase;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/reception", "/api/reception"})
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class ReceptionController {

    private final CheckinUseCase checkinUseCase;
    private final BillingService billingService;

    public ReceptionController(CheckinUseCase checkinUseCase, BillingService billingService) {
        this.checkinUseCase = checkinUseCase;
        this.billingService = billingService;
    }

    public record QrCheckinRequest(String bookingCode) {}
    public record CccdCheckinRequest(String cccdNumber, String fullName) {}

    @PostMapping("/checkin/qr")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<CheckinUseCase.CheckinResult> checkinByQr(@RequestBody QrCheckinRequest req) {
        CheckinUseCase.CheckinResult result = checkinUseCase.checkinByQrCode(req.bookingCode());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/checkin/cccd")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<CheckinUseCase.CheckinResult> checkinByCccd(@RequestBody CccdCheckinRequest req) {
        CheckinUseCase.CheckinResult result = checkinUseCase.checkinByCccd(req.cccdNumber(), req.fullName());
        return ResponseEntity.ok(result);
    }

    /**
     * CLAB-108: Lấy chi tiết thanh toán của ca khám (Tiền công khám + Tiền thuốc).
     */
    @GetMapping("/appointments/{id}/bill")
    public ResponseEntity<BillingDtos.BillDetailResponse> getBillDetail(@PathVariable String id) {
        BillingDtos.BillDetailResponse response = billingService.getBillDetail(id);
        return ResponseEntity.ok(response);
    }

    /**
     * CLAB-108: Xác nhận thanh toán hóa đơn tại quầy tiếp đón.
     */
    @PostMapping("/invoices/{invoiceId}/pay")
    public ResponseEntity<BillingDtos.PayInvoiceResponse> payInvoice(
            @PathVariable String invoiceId,
            @Valid @RequestBody BillingDtos.PayInvoiceRequest request) {
        BillingDtos.PayInvoiceResponse response = billingService.payInvoice(invoiceId, request);
        return ResponseEntity.ok(response);
    }
}

