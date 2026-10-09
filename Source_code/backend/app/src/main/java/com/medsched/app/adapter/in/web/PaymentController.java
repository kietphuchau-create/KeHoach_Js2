package com.medsched.app.adapter.in.web;

import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.PaymentEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.PaymentMethod;
import com.medsched.persistence.enums.PaymentStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.PaymentJpaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping({"/api/v1/payments", "/api/payments"})
public class PaymentController {

    private final AppointmentJpaRepository appointmentJpaRepository;
    private final PaymentJpaRepository paymentJpaRepository;

    public PaymentController(AppointmentJpaRepository appointmentJpaRepository,
                             PaymentJpaRepository paymentJpaRepository) {
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.paymentJpaRepository = paymentJpaRepository;
    }

    public record CreatePaymentRequest(
            String appointmentId,
            String bookingCode,
            String paymentType, // "DEPOSIT" (Giữ chỗ) hoặc "FULL" (Thanh toán đủ)
            BigDecimal amount,
            String method       // "MOMO", "BANK_TRANSFER", "VIETQR"
    ) {}

    public record CreatePaymentResponse(
            String transactionRef,
            String appointmentId,
            String bookingCode,
            BigDecimal amount,
            String paymentType,
            String transferContent,
            String status
    ) {}

    public record ConfirmPaymentRequest(
            String appointmentId,
            String bookingCode,
            String transactionRef,
            BigDecimal amount,
            String paymentType
    ) {}

    /**
     * 1. Khởi tạo giao dịch thanh toán (Giữ chỗ hoặc Thanh toán toàn phần).
     */
    @PostMapping("/create")
    @Transactional
    public ResponseEntity<CreatePaymentResponse> createPayment(@RequestBody CreatePaymentRequest req) {
        AppointmentEntity appointment = null;
        if (req.appointmentId() != null && !req.appointmentId().isBlank()) {
            appointment = appointmentJpaRepository.findById(req.appointmentId().trim()).orElse(null);
        }
        if (appointment == null && req.bookingCode() != null && !req.bookingCode().isBlank()) {
            appointment = appointmentJpaRepository.findByBookingCode(req.bookingCode().trim()).orElse(null);
        }

        if (appointment == null) {
            return ResponseEntity.badRequest().build();
        }

        String type = (req.paymentType() != null && req.paymentType().equalsIgnoreCase("DEPOSIT")) 
                ? "DEPOSIT" 
                : "FULL";

        // Mặc định: Giữ chỗ = 2.000đ, Thanh toán đủ = 200.000đ (hoặc theo số tiền gửi lên)
        BigDecimal finalAmount = req.amount();
        if (finalAmount == null || finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            finalAmount = "DEPOSIT".equals(type) ? new BigDecimal("2000") : new BigDecimal("200000");
        }

        String txnRef = "TXN" + System.currentTimeMillis() + (int)(Math.random() * 900 + 100);
        String transferContent = "MEDPAY " + appointment.getBookingCode();

        PaymentMethod pMethod = PaymentMethod.MOMO;
        if (req.method() != null && req.method().equalsIgnoreCase("BANK_TRANSFER")) {
            pMethod = PaymentMethod.BANK_TRANSFER;
        }

        PaymentEntity payment = new PaymentEntity(
                UUID.randomUUID().toString(),
                appointment.getId(),
                finalAmount,
                pMethod,
                PaymentStatus.PENDING,
                txnRef,
                Instant.now(),
                Instant.now()
        );
        payment.setNote(type + ":" + transferContent);
        paymentJpaRepository.save(payment);

        return ResponseEntity.ok(new CreatePaymentResponse(
                txnRef,
                appointment.getId(),
                appointment.getBookingCode(),
                finalAmount,
                type,
                transferContent,
                "PENDING"
        ));
    }

    /**
     * 2. Kiểm tra trạng thái thanh toán Realtime (Polling cho giao diện người dùng).
     */
    @GetMapping("/check-status")
    public ResponseEntity<?> checkStatus(
            @RequestParam(required = false) String appointmentId,
            @RequestParam(required = false) String bookingCode,
            @RequestParam(required = false) String transactionRef
    ) {
        String targetAppId = appointmentId;
        if ((targetAppId == null || targetAppId.isBlank()) && bookingCode != null && !bookingCode.isBlank()) {
            Optional<AppointmentEntity> appOpt = appointmentJpaRepository.findByBookingCode(bookingCode.trim());
            if (appOpt.isPresent()) {
                targetAppId = appOpt.get().getId();
            }
        }

        if (targetAppId != null && !targetAppId.isBlank()) {
            BigDecimal netAmount = paymentJpaRepository.sumSucceededNetAmount(targetAppId);
            List<PaymentEntity> payments = paymentJpaRepository.findByAppointmentId(targetAppId);
            
            boolean hasSuccess = netAmount != null && netAmount.compareTo(BigDecimal.ZERO) > 0;
            if (!hasSuccess) {
                hasSuccess = payments.stream().anyMatch(p -> p.getStatus() == PaymentStatus.SUCCEEDED);
            }

            if (hasSuccess) {
                PaymentEntity latestSuccess = payments.stream()
                        .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED)
                        .max(Comparator.comparing(PaymentEntity::getCreatedAt))
                        .orElse(null);

                String note = latestSuccess != null ? latestSuccess.getNote() : "";
                String paymentType = note != null && note.startsWith("DEPOSIT") ? "DEPOSIT" : "FULL";

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "status", "SUCCEEDED",
                        "amountPaid", netAmount != null ? netAmount : (latestSuccess != null ? latestSuccess.getAmount() : 0),
                        "paymentType", paymentType,
                        "transactionRef", latestSuccess != null ? latestSuccess.getTransactionRef() : ""
                ));
            }
        }

        if (transactionRef != null && !transactionRef.isBlank()) {
            Optional<PaymentEntity> payOpt = paymentJpaRepository.findByTransactionRef(transactionRef.trim());
            if (payOpt.isPresent() && payOpt.get().getStatus() == PaymentStatus.SUCCEEDED) {
                PaymentEntity p = payOpt.get();
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "status", "SUCCEEDED",
                        "amountPaid", p.getAmount(),
                        "transactionRef", p.getTransactionRef()
                ));
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", false,
                "status", "PENDING",
                "amountPaid", 0
        ));
    }

    /**
     * 3. Webhook nhận từ PayOS / Cổng thanh toán Open Banking khi tiền về tài khoản.
     */
    @PostMapping("/webhook")
    @Transactional
    public ResponseEntity<?> receiveWebhook(@RequestBody Map<String, Object> payload) {
        try {
            // PayOS format: payload chứa "data": { "amount": 10000, "description": "MEDPAY MED478011", ... }
            Map<String, Object> data = payload;
            if (payload.containsKey("data") && payload.get("data") instanceof Map) {
                data = (Map<String, Object>) payload.get("data");
            }

            String description = data.getOrDefault("description", "").toString();
            String amountStr = data.getOrDefault("amount", "0").toString();
            BigDecimal amount = new BigDecimal(amountStr);

            // Trích xuất mã booking hoặc transactionRef từ nội dung chuyển khoản
            String bookingCode = extractBookingCodeFromText(description);
            AppointmentEntity appointment = null;
            if (!bookingCode.isBlank()) {
                appointment = appointmentJpaRepository.findByBookingCode(bookingCode).orElse(null);
            }

            if (appointment != null) {
                // Đánh dấu payment đã thanh toán thành công
                List<PaymentEntity> pendingList = paymentJpaRepository.findByAppointmentId(appointment.getId());
                PaymentEntity payment = pendingList.stream()
                        .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                        .findFirst()
                        .orElse(null);

                if (payment == null) {
                    payment = new PaymentEntity(
                            UUID.randomUUID().toString(),
                            appointment.getId(),
                            amount,
                            PaymentMethod.MOMO,
                            PaymentStatus.SUCCEEDED,
                            "WEBHOOK" + System.currentTimeMillis(),
                            Instant.now(),
                            Instant.now()
                    );
                } else {
                    payment.setStatus(PaymentStatus.SUCCEEDED);
                    payment.setAmount(amount);
                    payment.setUpdatedAt(Instant.now());
                }
                payment.setPaidAt(Instant.now());
                paymentJpaRepository.save(payment);

                // Cập nhật trạng thái ca khám sang CONFIRMED
                if (appointment.getStatus() == AppointmentStatus.PENDING) {
                    appointment.setStatus(AppointmentStatus.CONFIRMED);
                    appointment.setUpdatedAt(Instant.now());
                    appointmentJpaRepository.save(appointment);
                }

                return ResponseEntity.ok(Map.of("error", 0, "message", "Webhook processed successfully"));
            }

            return ResponseEntity.ok(Map.of("error", 0, "message", "Ignored: No matching appointment"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("error", 1, "message", e.getMessage()));
        }
    }

    /**
     * 4. Xác nhận thanh toán: CHỈ cho phép khi hệ thống đã nhận được tiền thực tế (Status SUCCEEDED).
     * Nếu chưa chuyển tiền hoặc tiền chưa vào tài khoản, TỪ CHỐI xác nhận.
     */
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmPayment(@RequestBody ConfirmPaymentRequest req) {
        AppointmentEntity appointment = null;
        if (req.appointmentId() != null && !req.appointmentId().isBlank()) {
            appointment = appointmentJpaRepository.findById(req.appointmentId().trim()).orElse(null);
        }
        if (appointment == null && req.bookingCode() != null && !req.bookingCode().isBlank()) {
            appointment = appointmentJpaRepository.findByBookingCode(req.bookingCode().trim()).orElse(null);
        }

        if (appointment == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Không tìm thấy lịch hẹn"));
        }

        // KIỂM TRA NGHIÊM NGẶT: Đã có giao dịch thành công (SUCCEEDED) hay chưa?
        List<PaymentEntity> payments = paymentJpaRepository.findByAppointmentId(appointment.getId());
        boolean hasSuccessPayment = payments.stream().anyMatch(p -> p.getStatus() == PaymentStatus.SUCCEEDED);

        if (!hasSuccessPayment) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "status", "PENDING",
                    "error", "Chưa nhận được thanh toán từ ngân hàng! Bạn chưa được quyền xác nhận thanh toán khi chưa hoàn tất chuyển tiền."
            ));
        }

        PaymentEntity successPayment = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED)
                .max(Comparator.comparing(PaymentEntity::getCreatedAt))
                .orElse(null);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Xác nhận thanh toán thành công",
                "appointmentId", appointment.getId(),
                "bookingCode", appointment.getBookingCode(),
                "amountPaid", successPayment != null ? successPayment.getAmount() : BigDecimal.ZERO,
                "status", "SUCCEEDED"
        ));
    }

    /**
     * 5. Mô phỏng Webhook ngân hàng báo biến động số dư (Dành riêng cho Tester thử nghiệm luồng tự động).
     */
    @PostMapping("/webhook/simulate")
    @Transactional
    public ResponseEntity<?> simulateBankWebhook(@RequestBody Map<String, Object> req) {
        String bookingCode = req.getOrDefault("bookingCode", "").toString().trim();
        String amountStr = req.getOrDefault("amount", "2000").toString().trim();
        BigDecimal amount = new BigDecimal(amountStr);

        Map<String, Object> payload = Map.of(
                "data", Map.of(
                        "amount", amount,
                        "description", "MEDPAY " + bookingCode
                )
        );
        return receiveWebhook(payload);
    }

    /**
     * Tương thích ngược với URL tạo thanh toán VNPay cũ nếu còn gọi.
     */
    @GetMapping({"/vnpay/create-url", "/create-url"})
    public ResponseEntity<?> createPaymentUrl(@RequestParam String appointmentId) {
        AppointmentEntity appointment = appointmentJpaRepository.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ca khám"));
        String vnpTxnRef = "TXN" + System.currentTimeMillis();
        String mockUrl = "http://localhost:3000/vnpay-mock?appointmentId=" + appointmentId + "&vnp_TxnRef=" + vnpTxnRef + "&amount=200000";
        return ResponseEntity.ok(Map.of("url", mockUrl));
    }

    @GetMapping("/vnpay/ipn")
    @Transactional
    public ResponseEntity<?> vnpayIpn(
            @RequestParam String appointmentId,
            @RequestParam String vnp_TxnRef,
            @RequestParam String vnp_ResponseCode,
            @RequestParam(defaultValue = "200000") String vnp_Amount
    ) {
        if (paymentJpaRepository.findByTransactionRef(vnp_TxnRef).isPresent()) {
            return ResponseEntity.ok(Map.of("message", "Giao dịch đã được xử lý trước đó", "code", "00"));
        }

        AppointmentEntity appointment = appointmentJpaRepository.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ca khám"));

        PaymentEntity payment = new PaymentEntity(
                UUID.randomUUID().toString(),
                appointmentId,
                new BigDecimal(vnp_Amount),
                PaymentMethod.VNPAY,
                "00".equals(vnp_ResponseCode) ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
                vnp_TxnRef,
                Instant.now(),
                Instant.now()
        );

        if ("00".equals(vnp_ResponseCode)) {
            appointment.setStatus(AppointmentStatus.CONFIRMED);
            appointment.setUpdatedAt(Instant.now());
            appointmentJpaRepository.save(appointment);
        }

        paymentJpaRepository.save(payment);
        return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
    }

    private String extractBookingCodeFromText(String text) {
        if (text == null || text.isBlank()) return "";
        String s = text.toUpperCase();
        // Tìm pattern MED[A-Z0-9]+
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("(MED[-_A-Z0-9]{3,})");
        java.util.regex.Matcher m = p.matcher(s);
        if (m.find()) {
            return m.group(1).trim();
        }
        return "";
    }
}
