package com.medsched.app.adapter.in.web;

import com.medsched.core.port.in.CheckinUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reception")
public class ReceptionController {

    private final CheckinUseCase checkinUseCase;

    public ReceptionController(CheckinUseCase checkinUseCase) {
        this.checkinUseCase = checkinUseCase;
    }

    public record QrCheckinRequest(String bookingCode) {}
    public record CccdCheckinRequest(String cccdNumber, String fullName) {}

    @PostMapping("/checkin/qr")
    public ResponseEntity<CheckinUseCase.CheckinResult> checkinByQr(@RequestBody QrCheckinRequest req) {
        CheckinUseCase.CheckinResult result = checkinUseCase.checkinByQrCode(req.bookingCode());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/checkin/cccd")
    public ResponseEntity<CheckinUseCase.CheckinResult> checkinByCccd(@RequestBody CccdCheckinRequest req) {
        CheckinUseCase.CheckinResult result = checkinUseCase.checkinByCccd(req.cccdNumber(), req.fullName());
        return ResponseEntity.ok(result);
    }
}
