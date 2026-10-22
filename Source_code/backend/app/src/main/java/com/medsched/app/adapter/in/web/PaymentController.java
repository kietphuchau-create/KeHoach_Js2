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
    private final PayOsService payOsService;

    // Bộ nhớ đệm lưu trạng thái thanh toán theo bookingCode (hỗ trợ đặt lịch qua AI / Standalone trước khi lưu DB)
    private static final java.util.concurrent.ConcurrentHashMap<String, Map<String, Object>> standalonePaymentMap = new java.util.concurrent.ConcurrentHashMap<>();
    private static final java.util.concurrent.ConcurrentHashMap<String, Long> standaloneOrderMap = new java.util.concurrent.ConcurrentHashMap<>();

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.medsched.persistence.repository.DoctorJpaRepository doctorJpaRepository;

    public PaymentController(AppointmentJpaRepository appointmentJpaRepository,
                             PaymentJpaRepository paymentJpaRepository,
                             PayOsService payOsService) {
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.paymentJpaRepository = paymentJpaRepository;
        this.payOsService = payOsService;
    }

    public void setDoctorJpaRepository(com.medsched.persistence.repository.DoctorJpaRepository doctorJpaRepository) {
        this.doctorJpaRepository = doctorJpaRepository;
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
            String status,
            String checkoutUrl,
            String qrCode,
            String accountNumber,
            String accountName,
            String bin
    ) {
        public CreatePaymentResponse(
                String transactionRef,
                String appointmentId,
                String bookingCode,
                BigDecimal amount,
                String paymentType,
                String transferContent,
                String status,
                String checkoutUrl,
                String qrCode
        ) {
            this(transactionRef, appointmentId, bookingCode, amount, paymentType, transferContent, status, checkoutUrl, qrCode, null, null, null);
        }

        public CreatePaymentResponse(
                String transactionRef,
                String appointmentId,
                String bookingCode,
                BigDecimal amount,
                String paymentType,
                String transferContent,
                String status
        ) {
            this(transactionRef, appointmentId, bookingCode, amount, paymentType, transferContent, status, null, null, null, null, null);
        }
    }

    public record ConfirmPaymentRequest(
            String appointmentId,
            String bookingCode,
            String transactionRef,
            BigDecimal amount,
            String paymentType,
            String promoCode
    ) {
        public ConfirmPaymentRequest(String appointmentId, String bookingCode, String transactionRef, BigDecimal amount, String paymentType) {
            this(appointmentId, bookingCode, transactionRef, amount, paymentType, null);
        }
    }

    /**
     * Helper tìm ca khám linh hoạt qua appointmentId hoặc bookingCode
     * (Hỗ trợ cả trường hợp có hoặc không có dấu gạch ngang, chữ hoa/thường).
     */
    private Optional<AppointmentEntity> findAppointment(String appointmentId, String bookingCode) {
        if (appointmentId != null && !appointmentId.isBlank()) {
            Optional<AppointmentEntity> opt = appointmentJpaRepository.findById(appointmentId.trim());
            if (opt.isPresent()) return opt;
        }
        if (bookingCode != null && !bookingCode.isBlank()) {
            String code = bookingCode.trim();
            Optional<AppointmentEntity> opt = appointmentJpaRepository.findByBookingCode(code);
            if (opt.isPresent()) return opt;

            String clean = code.replaceAll("[^a-zA-Z0-9]", "");
            opt = appointmentJpaRepository.findByBookingCode(clean);
            if (opt.isPresent()) return opt;

            opt = appointmentJpaRepository.findByBookingCode(clean.toUpperCase());
            if (opt.isPresent()) return opt;

            if (clean.toUpperCase().startsWith("MED") && clean.length() > 3) {
                String withHyphen = "MED-" + clean.toUpperCase().substring(3);
                opt = appointmentJpaRepository.findByBookingCode(withHyphen);
                if (opt.isPresent()) return opt;
            }
        }
        return Optional.empty();
    }

    /**
     * 1. Khởi tạo giao dịch thanh toán (Giữ chỗ hoặc Thanh toán toàn phần).
     * Kết nối cổng PayOS & VietQR PRO tự động nhận diện tiền về KienlongBank.
     */
    @PostMapping("/create")
    @Transactional
    public ResponseEntity<CreatePaymentResponse> createPayment(@RequestBody CreatePaymentRequest req) {
        AppointmentEntity appointment = findAppointment(req.appointmentId(), req.bookingCode()).orElse(null);

        String effectiveBookingCode = appointment != null ? appointment.getBookingCode() : req.bookingCode();
        if (appointment == null && (effectiveBookingCode == null || effectiveBookingCode.isBlank())) {
            return ResponseEntity.badRequest().build();
        }

        String type = (req.paymentType() != null && req.paymentType().equalsIgnoreCase("DEPOSIT")) 
                ? "DEPOSIT" 
                : "FULL";

        // Mặc định: Giữ chỗ = 2.000đ, Thanh toán đủ = phí khám thực tế của bác sĩ (hoặc 200.000đ fallback)
        BigDecimal finalAmount = req.amount();
        if (finalAmount == null || finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            if ("DEPOSIT".equals(type)) {
                finalAmount = new BigDecimal("2000");
            } else {
                BigDecimal docFee = null;
                if (appointment != null && appointment.getDoctorId() != null && doctorJpaRepository != null) {
                    docFee = doctorJpaRepository.findById(appointment.getDoctorId())
                            .map(com.medsched.persistence.entity.DoctorEntity::getConsultationFee)
                            .orElse(null);
                }
                finalAmount = (docFee != null && docFee.compareTo(BigDecimal.ZERO) > 0) ? docFee : new BigDecimal("200000");
            }
        }

        long orderCode = System.currentTimeMillis() % 1000000000L;
        String cleanBookingCode = effectiveBookingCode.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        standaloneOrderMap.put(cleanBookingCode, orderCode);
        String transferContent = "MEDPAY " + cleanBookingCode;
        if (transferContent.length() > 25) {
            transferContent = transferContent.substring(0, 25);
        }

        String txnRef = String.valueOf(orderCode);
        String checkoutUrl = null;
        String qrCode = null;
        String accountNumber = null;
        String accountName = null;
        String bin = null;

        // Gọi PayOS API để tạo Payment Link và VietQR PRO động
        if (payOsService != null) {
            try {
                var payOsResult = payOsService.createPaymentLink(
                        orderCode,
                        finalAmount.intValue(),
                        transferContent,
                        "http://localhost:3000/my-appointments?status=success",
                        "http://localhost:3000/my-appointments?status=cancelled"
                );
                if (payOsResult.isPresent()) {
                    var info = payOsResult.get();
                    checkoutUrl = info.checkoutUrl();
                    qrCode = info.qrCode();
                    accountNumber = info.accountNumber();
                    accountName = info.accountName();
                    bin = info.bin();
                }
            } catch (Exception e) {
                // Fallback nếu PayOS offline hoặc chưa cấu hình
            }
        }

        PaymentMethod pMethod = PaymentMethod.BANK_TRANSFER;
        if (req.method() != null && req.method().equalsIgnoreCase("MOMO")) {
            pMethod = PaymentMethod.MOMO;
        }

        if (appointment == null) {
            return ResponseEntity.ok(new CreatePaymentResponse(
                    txnRef,
                    null,
                    effectiveBookingCode,
                    finalAmount,
                    type,
                    transferContent,
                    "PENDING",
                    checkoutUrl,
                    qrCode,
                    accountNumber,
                    accountName,
                    bin
            ));
        }

        // Tái sử dụng Payment PENDING nếu đã tồn tại cho lịch hẹn này
        List<PaymentEntity> existingPayments = paymentJpaRepository.findByAppointmentId(appointment.getId());
        PaymentEntity payment = existingPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                .findFirst()
                .orElse(null);

        if (payment == null) {
            payment = new PaymentEntity(
                    UUID.randomUUID().toString(),
                    appointment.getId(),
                    finalAmount,
                    pMethod,
                    PaymentStatus.PENDING,
                    txnRef,
                    Instant.now(),
                    Instant.now()
            );
        } else {
            payment.setAmount(finalAmount);
            payment.setMethod(pMethod);
            payment.setTransactionRef(txnRef);
            payment.setUpdatedAt(Instant.now());
        }
        payment.setNote(type + ":" + transferContent);
        paymentJpaRepository.save(payment);

        return ResponseEntity.ok(new CreatePaymentResponse(
                txnRef,
                appointment.getId(),
                appointment.getBookingCode(),
                finalAmount,
                type,
                transferContent,
                "PENDING",
                checkoutUrl,
                qrCode,
                accountNumber,
                accountName,
                bin
        ));
    }

    /**
     * 2. Kiểm tra trạng thái thanh toán Realtime (Polling cho giao diện người dùng).
     * Tự động đồng bộ trạng thái trực tiếp với PayOS khi có giao dịch tiền về KienlongBank.
     */
    @GetMapping("/check-status")
    public ResponseEntity<?> checkStatus(
            @RequestParam(required = false) String appointmentId,
            @RequestParam(required = false) String bookingCode,
            @RequestParam(required = false) String transactionRef
    ) {
        String targetAppId = appointmentId;
        if ((targetAppId == null || targetAppId.isBlank()) && bookingCode != null && !bookingCode.isBlank()) {
            Optional<AppointmentEntity> appOpt = findAppointment(null, bookingCode);
            if (appOpt.isPresent()) {
                targetAppId = appOpt.get().getId();
            } else {
                String clean = bookingCode.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
                if (standalonePaymentMap.containsKey(clean)) {
                    Map<String, Object> paid = standalonePaymentMap.get(clean);
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "status", "SUCCEEDED",
                            "amountPaid", paid.getOrDefault("amount", new BigDecimal("2000")),
                            "paymentType", paid.getOrDefault("paymentType", "DEPOSIT"),
                            "transactionRef", paid.getOrDefault("transactionRef", "")
                    ));
                }
                Long orderCode = standaloneOrderMap.get(clean);
                if (orderCode != null && payOsService != null) {
                    try {
                        var infoOpt = payOsService.getPaymentInfo(orderCode);
                        if (infoOpt.isPresent() && "PAID".equalsIgnoreCase(infoOpt.get().status())) {
                            standalonePaymentMap.put(clean, Map.of(
                                    "amount", new BigDecimal(infoOpt.get().amount()),
                                    "paymentType", "DEPOSIT",
                                    "transactionRef", String.valueOf(orderCode)
                            ));
                            return ResponseEntity.ok(Map.of(
                                    "success", true,
                                    "status", "SUCCEEDED",
                                    "amountPaid", infoOpt.get().amount(),
                                    "paymentType", "DEPOSIT",
                                    "transactionRef", String.valueOf(orderCode)
                            ));
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        if (targetAppId != null && !targetAppId.isBlank()) {
            List<PaymentEntity> payments = paymentJpaRepository.findByAppointmentId(targetAppId);

            // Kiểm tra trạng thái trực tiếp từ PayOS cho các giao dịch PENDING
            boolean hasSuccess = payments.stream().anyMatch(p -> p.getStatus() == PaymentStatus.SUCCEEDED);
            if (!hasSuccess && payOsService != null) {
                for (PaymentEntity p : payments) {
                    if (p.getStatus() == PaymentStatus.PENDING && p.getTransactionRef() != null && p.getTransactionRef().matches("\\d+")) {
                        try {
                            long orderCode = Long.parseLong(p.getTransactionRef());
                            var infoOpt = payOsService.getPaymentInfo(orderCode);
                            if (infoOpt.isPresent() && "PAID".equalsIgnoreCase(infoOpt.get().status())) {
                                p.setStatus(PaymentStatus.SUCCEEDED);
                                p.setPaidAt(Instant.now());
                                p.setUpdatedAt(Instant.now());
                                paymentJpaRepository.save(p);

                                AppointmentEntity app = appointmentJpaRepository.findById(p.getAppointmentId()).orElse(null);
                                if (app != null && app.getStatus() == AppointmentStatus.PENDING) {
                                    app.setStatus(AppointmentStatus.CONFIRMED);
                                    app.setUpdatedAt(Instant.now());
                                    appointmentJpaRepository.save(app);
                                }
                                hasSuccess = true;
                                break;
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }

            BigDecimal netAmount = paymentJpaRepository.sumSucceededNetAmount(targetAppId);
            if (!hasSuccess) {
                hasSuccess = netAmount != null && netAmount.compareTo(BigDecimal.ZERO) > 0;
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
                        "amountPaid", netAmount != null && netAmount.compareTo(BigDecimal.ZERO) > 0 ? netAmount : (latestSuccess != null ? latestSuccess.getAmount() : 0),
                        "paymentType", paymentType,
                        "transactionRef", latestSuccess != null ? latestSuccess.getTransactionRef() : ""
                ));
            }
        }

        if (transactionRef != null && !transactionRef.isBlank()) {
            Optional<PaymentEntity> payOpt = paymentJpaRepository.findByTransactionRef(transactionRef.trim());
            if (payOpt.isPresent()) {
                PaymentEntity p = payOpt.get();
                if (p.getStatus() == PaymentStatus.PENDING && p.getTransactionRef() != null && p.getTransactionRef().matches("\\d+") && payOsService != null) {
                    try {
                        long orderCode = Long.parseLong(p.getTransactionRef());
                        var infoOpt = payOsService.getPaymentInfo(orderCode);
                        if (infoOpt.isPresent() && "PAID".equalsIgnoreCase(infoOpt.get().status())) {
                            p.setStatus(PaymentStatus.SUCCEEDED);
                            p.setPaidAt(Instant.now());
                            p.setUpdatedAt(Instant.now());
                            paymentJpaRepository.save(p);

                            AppointmentEntity app = appointmentJpaRepository.findById(p.getAppointmentId()).orElse(null);
                            if (app != null && app.getStatus() == AppointmentStatus.PENDING) {
                                app.setStatus(AppointmentStatus.CONFIRMED);
                                app.setUpdatedAt(Instant.now());
                                appointmentJpaRepository.save(app);
                            }
                        }
                    } catch (Exception ignored) {}
                }

                if (p.getStatus() == PaymentStatus.SUCCEEDED) {
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "status", "SUCCEEDED",
                            "amountPaid", p.getAmount(),
                            "transactionRef", p.getTransactionRef()
                    ));
                }
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
            // Xác thực chữ ký PayOS nếu có
            if (payload.containsKey("signature") && payload.get("data") instanceof Map<?, ?> dataMap) {
                String signature = String.valueOf(payload.get("signature"));
                if (payOsService != null) {
                    payOsService.verifyWebhookSignature((Map<String, Object>) dataMap, signature);
                }
            }

            // PayOS format: payload chứa "data": { "orderCode": 12345, "amount": 2000, "description": "MEDPAY MED478011", ... }
            Map<String, Object> data = payload;
            if (payload.containsKey("data") && payload.get("data") instanceof Map<?, ?> map) {
                data = (Map<String, Object>) map;
            }

            // 1. Khớp theo orderCode (transactionRef) nếu có
            if (data.containsKey("orderCode") && data.get("orderCode") != null) {
                String orderCodeStr = String.valueOf(data.get("orderCode"));
                Optional<PaymentEntity> pOpt = paymentJpaRepository.findByTransactionRef(orderCodeStr);
                if (pOpt.isPresent()) {
                    PaymentEntity payment = pOpt.get();
                    payment.setStatus(PaymentStatus.SUCCEEDED);
                    payment.setPaidAt(Instant.now());
                    payment.setUpdatedAt(Instant.now());
                    paymentJpaRepository.save(payment);

                    appointmentJpaRepository.findById(payment.getAppointmentId()).ifPresent(app -> {
                        if (app.getStatus() == AppointmentStatus.PENDING) {
                            app.setStatus(AppointmentStatus.CONFIRMED);
                            app.setUpdatedAt(Instant.now());
                            appointmentJpaRepository.save(app);
                        }
                    });
                    return ResponseEntity.ok(Map.of("error", 0, "message", "Webhook processed via orderCode"));
                }
            }

            // 2. Fallback khớp theo description / booking code
            String description = "";
            if (data.containsKey("content") && data.get("content") != null) {
                description = data.get("content").toString();
            }
            if (description.isBlank() && data.containsKey("description") && data.get("description") != null) {
                description = data.get("description").toString();
            }

            String amountStr = "0";
            if (data.containsKey("transferAmount") && data.get("transferAmount") != null) {
                amountStr = data.get("transferAmount").toString();
            } else if (data.containsKey("amount") && data.get("amount") != null) {
                amountStr = data.get("amount").toString();
            }
            String cleanDigits = amountStr.replaceAll("[^0-9.]", "");
            BigDecimal amount = new BigDecimal(cleanDigits.isBlank() ? "0" : cleanDigits);

            // Trích xuất mã booking từ nội dung chuyển khoản
            String bookingCode = extractBookingCodeFromText(description);
            if (!bookingCode.isBlank()) {
                String clean = bookingCode.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
                String txnRef = (data.containsKey("orderCode") && data.get("orderCode") != null)
                        ? String.valueOf(data.get("orderCode"))
                        : ("WEBHOOK" + System.currentTimeMillis());
                standalonePaymentMap.put(clean, Map.of(
                        "amount", amount,
                        "transactionRef", txnRef,
                        "paymentType", amount.compareTo(new BigDecimal("50000")) < 0 ? "DEPOSIT" : "FULL",
                        "paidAt", Instant.now().toString()
                ));
            }
            AppointmentEntity appointment = null;
            if (!bookingCode.isBlank()) {
                appointment = findAppointment(null, bookingCode).orElse(null);
            }

            if (appointment != null) {
                // Đánh dấu payment đã thanh toán thành công
                List<PaymentEntity> pendingList = paymentJpaRepository.findByAppointmentId(appointment.getId());
                PaymentEntity payment = pendingList.stream()
                        .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                        .findFirst()
                        .orElse(null);

                String pType = amount.compareTo(new BigDecimal("50000")) < 0 ? "DEPOSIT" : "FULL";

                if (payment == null) {
                    payment = new PaymentEntity(
                            UUID.randomUUID().toString(),
                            appointment.getId(),
                            amount,
                            PaymentMethod.BANK_TRANSFER,
                            PaymentStatus.SUCCEEDED,
                            "WEBHOOK" + System.currentTimeMillis(),
                            Instant.now(),
                            Instant.now()
                    );
                } else {
                    payment.setStatus(PaymentStatus.SUCCEEDED);
                    payment.setAmount(amount);
                    payment.setMethod(PaymentMethod.BANK_TRANSFER);
                    payment.setUpdatedAt(Instant.now());
                }
                payment.setPaidAt(Instant.now());
                payment.setNote(pType + ":MEDPAY " + appointment.getBookingCode());
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
     * 4. Xác nhận chuyển tiền đặt cọc / thanh toán viện phí:
     * Người bệnh hoặc nhân viên bấm xác nhận đã chuyển tiền thành công qua VietQR Napas 247.
     * Cập nhật bản ghi thanh toán sang SUCCEEDED và chuyển ca khám sang CONFIRMED.
     */
    @PostMapping("/confirm")
    @Transactional
    public ResponseEntity<?> confirmPayment(@RequestBody ConfirmPaymentRequest req) {
        try {
            AppointmentEntity appointment = findAppointment(req.appointmentId(), req.bookingCode()).orElse(null);

            if (appointment == null) {
                if (req.bookingCode() != null && !req.bookingCode().isBlank()) {
                    boolean isPromoFree = (req.promoCode() != null && !req.promoCode().isBlank())
                            || "PROMO_FREE".equalsIgnoreCase(req.paymentType())
                            || "VOUCHER".equalsIgnoreCase(req.paymentType());
                    String type = isPromoFree ? "PROMO_FREE" : "DEPOSIT";
                    BigDecimal finalAmount = isPromoFree ? BigDecimal.ZERO : new BigDecimal("2000");
                    String clean = req.bookingCode().replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
                    String fallbackTxnRef = (req.transactionRef() != null && !req.transactionRef().isBlank())
                            ? req.transactionRef().trim()
                            : (isPromoFree ? ("VOUCHER-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()) : ("CONFIRM" + System.currentTimeMillis()));
                    standalonePaymentMap.put(clean, Map.of(
                            "amount", finalAmount,
                            "paymentType", type,
                            "transactionRef", fallbackTxnRef,
                            "paidAt", Instant.now().toString()
                    ));
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "message", "Xác nhận thành công",
                            "bookingCode", req.bookingCode(),
                            "amountPaid", finalAmount,
                            "paymentType", type
                    ));
                }
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Không tìm thấy lịch hẹn"));
            }

            boolean isPromoFree = (req.promoCode() != null && !req.promoCode().isBlank())
                    || "PROMO_FREE".equalsIgnoreCase(req.paymentType())
                    || "VOUCHER".equalsIgnoreCase(req.paymentType());

            String type = isPromoFree
                    ? "PROMO_FREE"
                    : (req.paymentType() != null && req.paymentType().equalsIgnoreCase("DEPOSIT")) 
                        ? "DEPOSIT" 
                        : "FULL";

            BigDecimal finalAmount = req.amount();
            if (isPromoFree) {
                finalAmount = BigDecimal.ZERO;
            } else if (finalAmount == null || finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
                finalAmount = "DEPOSIT".equals(type) ? new BigDecimal("2000") : new BigDecimal("200000");
            }

            String promoTag = (req.promoCode() != null && !req.promoCode().isBlank())
                    ? req.promoCode().trim().toUpperCase()
                    : (isPromoFree ? "GIAOVIEN" : "");

            String noteText = isPromoFree
                    ? ("VOUCHER:" + promoTag + ":MEDPAY " + appointment.getBookingCode())
                    : (type + ":MEDPAY " + appointment.getBookingCode());

            String fallbackTxnRef = (req.transactionRef() != null && !req.transactionRef().isBlank())
                    ? req.transactionRef().trim()
                    : (isPromoFree ? ("VOUCHER-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase()) : ("CONFIRM" + System.currentTimeMillis()));

            List<PaymentEntity> payments = paymentJpaRepository.findByAppointmentId(appointment.getId());
            PaymentEntity successPayment = payments.stream()
                    .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED)
                    .findFirst()
                    .orElse(null);

            if (successPayment == null) {
                // Tìm payment pending để hoàn tất thành công
                PaymentEntity pendingPayment = payments.stream()
                        .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                        .findFirst()
                        .orElse(null);

                if (pendingPayment != null) {
                    pendingPayment.setStatus(PaymentStatus.SUCCEEDED);
                    pendingPayment.setAmount(finalAmount);
                    pendingPayment.setMethod(PaymentMethod.BANK_TRANSFER);
                    pendingPayment.setPaidAt(Instant.now());
                    pendingPayment.setUpdatedAt(Instant.now());
                    pendingPayment.setNote(noteText);
                    if (pendingPayment.getTransactionRef() == null || pendingPayment.getTransactionRef().isBlank()) {
                        pendingPayment.setTransactionRef(fallbackTxnRef);
                    }
                    successPayment = paymentJpaRepository.save(pendingPayment);
                } else {
                    PaymentEntity newPayment = new PaymentEntity(
                            UUID.randomUUID().toString(),
                            appointment.getId(),
                            finalAmount,
                            PaymentMethod.BANK_TRANSFER,
                            PaymentStatus.SUCCEEDED,
                            fallbackTxnRef,
                            Instant.now(),
                            Instant.now()
                    );
                    newPayment.setPaidAt(Instant.now());
                    newPayment.setNote(noteText);
                    successPayment = paymentJpaRepository.save(newPayment);
                }
            } else {
                if (successPayment.getTransactionRef() == null || successPayment.getTransactionRef().isBlank()) {
                    successPayment.setTransactionRef(fallbackTxnRef);
                    successPayment = paymentJpaRepository.save(successPayment);
                }
            }

            // Cập nhật trạng thái ca khám sang CONFIRMED (hỗ trợ cả PENDING hoặc khôi phục từ CANCELLED do trễ)
            if (appointment.getStatus() == AppointmentStatus.PENDING || appointment.getStatus() == AppointmentStatus.CANCELLED) {
                appointment.setStatus(AppointmentStatus.CONFIRMED);
                appointment.setUpdatedAt(Instant.now());
                appointmentJpaRepository.save(appointment);
            }

            String effectiveTxnRef = successPayment != null && successPayment.getTransactionRef() != null
                    ? successPayment.getTransactionRef()
                    : fallbackTxnRef;

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("status", "SUCCEEDED");
            resp.put("message", isPromoFree ? "Áp dụng mã ưu đãi thành công! Miễn phí 100% tiền đặt cọc giữ chỗ." : "Xác nhận chuyển tiền đặt cọc thành công");
            resp.put("appointmentId", appointment.getId());
            resp.put("bookingCode", appointment.getBookingCode());
            resp.put("amountPaid", successPayment != null && successPayment.getAmount() != null ? successPayment.getAmount() : finalAmount);
            resp.put("paymentType", type);
            resp.put("promoCode", promoTag);
            resp.put("transactionRef", effectiveTxnRef);
            resp.put("paidAt", successPayment != null && successPayment.getPaidAt() != null ? successPayment.getPaidAt().toString() : Instant.now().toString());

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PaymentController.class).error("Lỗi xác nhận confirmPayment:", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "status", "FAILED",
                    "error", e.getMessage() != null ? e.getMessage() : "Lỗi hệ thống khi xác nhận thanh toán"
            ));
        }
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

        if (!bookingCode.isBlank()) {
            String clean = bookingCode.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            standalonePaymentMap.put(clean, Map.of(
                    "amount", amount,
                    "transactionRef", "SIM" + System.currentTimeMillis(),
                    "paymentType", "DEPOSIT",
                    "paidAt", Instant.now().toString()
            ));
        }

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
        // Loại bỏ tiền tố MEDPAY trước để tránh khớp nhầm chữ MEDPAY làm mã booking
        String s = text.toUpperCase().replace("MEDPAY", " ").trim();
        // Tìm pattern mã booking dạng MED[số/chữ] hoặc MED-[số/chữ]
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("(MED[-_A-Z0-9]{3,})");
        java.util.regex.Matcher m = p.matcher(s);
        if (m.find()) {
            return m.group(1).trim();
        }
        return "";
    }
}
