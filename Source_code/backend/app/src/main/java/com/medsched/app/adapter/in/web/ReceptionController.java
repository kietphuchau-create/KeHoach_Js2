package com.medsched.app.adapter.in.web;

import com.medsched.billing.BillingDtos;
import com.medsched.billing.BillingService;
import com.medsched.core.domain.model.Appointment;
import com.medsched.core.port.in.CheckinUseCase;
import com.medsched.core.port.out.AppointmentRepositoryPort;
import com.medsched.persistence.entity.AppointmentEntity;
import com.medsched.persistence.entity.DoctorEntity;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.AppointmentStatus;
import com.medsched.persistence.enums.CheckinMethod;
import com.medsched.persistence.enums.QueueType;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/reception", "/api/reception"})
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class ReceptionController {

    public static final int MAX_DAILY_WALKIN_PER_DOCTOR = 30;

    private final CheckinUseCase checkinUseCase;
    private final BillingService billingService;
    private final AppointmentJpaRepository appointmentJpaRepository;
    private final PatientProfileJpaRepository patientProfileJpaRepository;
    private final AppointmentRepositoryPort appointmentRepositoryPort;
    private final UserJpaRepository userJpaRepository;
    private final DoctorJpaRepository doctorJpaRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.medsched.reception.ReceptionHistoryService receptionHistoryService;

    public ReceptionController(
            CheckinUseCase checkinUseCase,
            BillingService billingService,
            AppointmentJpaRepository appointmentJpaRepository,
            PatientProfileJpaRepository patientProfileJpaRepository,
            AppointmentRepositoryPort appointmentRepositoryPort,
            UserJpaRepository userJpaRepository,
            DoctorJpaRepository doctorJpaRepository,
            PasswordEncoder passwordEncoder,
            com.medsched.reception.ReceptionHistoryService receptionHistoryService) {
        this.checkinUseCase = checkinUseCase;
        this.billingService = billingService;
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.patientProfileJpaRepository = patientProfileJpaRepository;
        this.appointmentRepositoryPort = appointmentRepositoryPort;
        this.userJpaRepository = userJpaRepository;
        this.doctorJpaRepository = doctorJpaRepository;
        this.passwordEncoder = passwordEncoder;
        this.receptionHistoryService = receptionHistoryService;
    }

    public record QrCheckinRequest(String bookingCode) {}
    public record CccdCheckinRequest(String cccdNumber, String fullName, String doctorId) {}
    public record WalkinRequest(
            String fullName,
            String phone,
            String cccdNumber,
            String doctorId,
            String specialty,
            String password
    ) {}

    public record WalkinResponse(
            String appointmentId,
            String bookingCode,
            String queueNumber,
            String patientName,
            String doctorId,
            String doctorName,
            String roomNumber,
            String specialtyName,
            String checkInTime,
            String status
    ) {}

    @PostMapping("/checkin/qr")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Transactional
    public ResponseEntity<CheckinUseCase.CheckinResult> checkinByQr(@RequestBody QrCheckinRequest req) {
        String code = req.bookingCode() != null ? req.bookingCode().trim() : "";
        Optional<AppointmentEntity> appOpt = appointmentJpaRepository.findByBookingCode(code);
        if (appOpt.isEmpty()) {
            appOpt = appointmentJpaRepository.findByQueueNumber(code);
        }

        if (appOpt.isPresent()) {
            AppointmentEntity app = appOpt.get();
            app.setStatus(AppointmentStatus.CHECKED_IN);
            app.setCheckInTime(Instant.now());
            app.setCheckinMethod(CheckinMethod.QR_CODE);
            String qNum = app.getQueueNumber();
            if (qNum != null && !qNum.startsWith("A-") && !qNum.startsWith("W-")) {
                if (app.getQueueType() == QueueType.WALKIN) {
                    qNum = "W-" + qNum;
                } else {
                    qNum = "A-" + qNum;
                }
                app.setQueueNumber(qNum);
            }
            app.setUpdatedAt(Instant.now());
            appointmentJpaRepository.save(app);

            Appointment domain = appointmentRepositoryPort.findById(app.getId()).orElse(null);
            return ResponseEntity.ok(new CheckinUseCase.CheckinResult(
                    domain,
                    app.getQueueNumber(),
                    "Tiếp đón thành công qua mã QR vé hẹn! Mời bệnh nhân vào phòng chờ."
            ));
        }

        CheckinUseCase.CheckinResult result = checkinUseCase.checkinByQrCode(code);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/checkin/cccd")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Transactional
    public ResponseEntity<CheckinUseCase.CheckinResult> checkinByCccd(@RequestBody CccdCheckinRequest req) {
        String cccd = req.cccdNumber() != null ? req.cccdNumber().trim() : "";
        String fullName = req.fullName() != null && !req.fullName().isBlank() ? req.fullName().trim() : "Bệnh nhân CCCD";

        if (!cccd.isBlank()) {
            List<PatientProfileEntity> profiles = patientProfileJpaRepository.findByCccdNumber(cccd)
                    .map(List::of)
                    .orElseGet(java.util.Collections::emptyList);

            for (PatientProfileEntity profile : profiles) {
                List<AppointmentEntity> appointments = appointmentJpaRepository.findByPatientProfileIdOrderByCreatedAtDesc(profile.getId());
                Optional<AppointmentEntity> activeOpt = appointments.stream()
                        .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED || a.getStatus() == AppointmentStatus.PENDING)
                        .findFirst();

                if (activeOpt.isPresent()) {
                    AppointmentEntity app = activeOpt.get();
                    app.setStatus(AppointmentStatus.CHECKED_IN);
                    app.setCheckInTime(Instant.now());
                    app.setCheckinMethod(CheckinMethod.CCCD_QR);
                    String appQNum = app.getQueueNumber();
                    if (appQNum != null && !appQNum.startsWith("A-") && !appQNum.startsWith("W-")) {
                        if (app.getQueueType() == QueueType.WALKIN) {
                            appQNum = "W-" + appQNum;
                        } else {
                            appQNum = "A-" + appQNum;
                        }
                        app.setQueueNumber(appQNum);
                    }
                    app.setUpdatedAt(Instant.now());
                    appointmentJpaRepository.save(app);

                    Appointment domain = appointmentRepositoryPort.findById(app.getId()).orElse(null);
                    return ResponseEntity.ok(new CheckinUseCase.CheckinResult(
                            domain,
                            app.getQueueNumber(),
                            "Tiếp đón thành công bệnh nhân " + profile.getFullName() + " (CCCD: " + cccd + ") qua thẻ CCCD gắn chip! Mời bệnh nhân vào phòng chờ."
                    ));
                }
            }

            // Trường hợp khách chưa có lịch hẹn đặt trước: Tự động tạo ca khám vãng lai tiếp nhận vào MySQL
            PatientProfileEntity profile = profiles.isEmpty() ? null : profiles.get(0);
            if (profile == null) {
                String genEmail = "cccd" + cccd + "@medsched.vn";
                UserEntity user = userJpaRepository.findByEmail(genEmail).orElseGet(() -> {
                    UserEntity u = new UserEntity(
                            UUID.randomUUID().toString(),
                            genEmail,
                            passwordEncoder.encode("Med@" + cccd.substring(Math.max(0, cccd.length() - 4))),
                            fullName,
                            null,
                            true,
                            Instant.now(),
                            Instant.now()
                    );
                    u.setCurrentSessionId(UUID.randomUUID().toString());
                    return userJpaRepository.save(u);
                });

                profile = new PatientProfileEntity(
                        UUID.randomUUID().toString(),
                        user.getId(),
                        RelationshipType.SELF,
                        fullName,
                        null,
                        null,
                        null,
                        null,
                        null,
                        cccd,
                        null,
                        Instant.now(),
                        Instant.now()
                );
                profile = patientProfileJpaRepository.save(profile);
            }

            DoctorEntity targetDoctor = null;
            if (req.doctorId() != null && !req.doctorId().isBlank()) {
                targetDoctor = doctorJpaRepository.findById(req.doctorId()).orElse(null);
            }
            if (targetDoctor == null) {
                targetDoctor = doctorJpaRepository.findAll().stream().findFirst().orElse(null);
            }

            String docId = targetDoctor != null ? targetDoctor.getId() : "10b2c3d4-0001-4000-8000-000000000001";
            LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            Instant startOfDay = today.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
            Instant endOfDay = today.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();

            // Kiểm soát hạn ngạch tiếp nhận vãng lai tránh quá tải phòng khám
            long walkinCount = appointmentJpaRepository.countByDoctorIdAndQueueTypeAndCreatedAtBetween(
                    docId, QueueType.WALKIN, startOfDay, endOfDay);
            if (walkinCount >= MAX_DAILY_WALKIN_PER_DOCTOR) {
                return ResponseEntity.badRequest().body(new CheckinUseCase.CheckinResult(
                        null,
                        null,
                        "Bác sĩ đã tiếp nhận đủ chỉ tiêu tối đa (" + MAX_DAILY_WALKIN_PER_DOCTOR
                        + " ca) bệnh nhân vãng lai hôm nay. Vui lòng chọn bác sĩ khác hoặc hẹn ngày mai!"
                ));
            }

            long count = appointmentJpaRepository.countByDoctorIdAndCreatedAtBetween(docId, startOfDay, endOfDay);
            String queueNum = "W-" + String.format("%02d", count + 1);
            String bookingCode = "CCCD-" + (100000 + new Random().nextInt(900000));

            AppointmentEntity walkinApp = new AppointmentEntity(
                    UUID.randomUUID().toString(),
                    bookingCode,
                    "a1b2c3d4-0001-4000-8000-000000000001",
                    profile.getId(),
                    docId,
                    null,
                    queueNum,
                    QueueType.WALKIN,
                    "Tiếp nhận vãng lai qua CCCD gắn chip",
                    AppointmentStatus.CHECKED_IN,
                    Instant.now(),
                    Instant.now()
            );
            walkinApp.setCheckinMethod(CheckinMethod.CCCD_QR);
            walkinApp.setCheckInTime(Instant.now());
            walkinApp = appointmentJpaRepository.save(walkinApp);

            Appointment domain = appointmentRepositoryPort.findById(walkinApp.getId()).orElse(null);
            return ResponseEntity.ok(new CheckinUseCase.CheckinResult(
                    domain,
                    queueNum,
                    "Đã cấp số thứ tự #" + queueNum + " cho bệnh nhân " + fullName + " (CCCD: " + cccd + ") thành công!"
            ));
        }

        CheckinUseCase.CheckinResult result = checkinUseCase.checkinByCccd(req.cccdNumber(), req.fullName());
        return ResponseEntity.ok(result);
    }

    /**
     * Tiếp nhận bệnh nhân vãng lai & cấp tài khoản tại quầy tiếp đón.
     * Lưu thực tế AppointmentEntity vào MySQL với status = CHECKED_IN.
     */
    @PostMapping("/walkin")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Transactional
    public ResponseEntity<WalkinResponse> registerWalkinPatient(@RequestBody WalkinRequest req) {
        String cleanPhone = req.phone() != null ? req.phone().trim() : "";
        String cleanName = req.fullName() != null && !req.fullName().isBlank() ? req.fullName().trim() : "Bệnh nhân vãng lai";
        String email = cleanPhone + "@medsched.vn";

        // 1. Tìm hoặc tạo User tài khoản
        UserEntity user = null;
        if (!cleanPhone.isBlank()) {
            user = userJpaRepository.findByPhone(cleanPhone).orElse(null);
        }
        if (user == null) {
            user = userJpaRepository.findByEmail(email).orElse(null);
        }
        if (user == null) {
            String rawPass = req.password() != null && !req.password().isBlank() ? req.password() : "Med@1234";
            user = new UserEntity(
                    UUID.randomUUID().toString(),
                    email,
                    passwordEncoder.encode(rawPass),
                    cleanName,
                    cleanPhone,
                    true,
                    Instant.now(),
                    Instant.now()
            );
            user.setCurrentSessionId(UUID.randomUUID().toString());
            user = userJpaRepository.save(user);
        }

        // 2. Tìm hoặc tạo PatientProfileEntity
        final String userId = user.getId();
        PatientProfileEntity profile = patientProfileJpaRepository.findByUserId(userId).stream()
                .findFirst()
                .orElse(null);

        if (profile == null) {
            profile = new PatientProfileEntity(
                    UUID.randomUUID().toString(),
                    userId,
                    RelationshipType.SELF,
                    cleanName,
                    null,
                    null,
                    null,
                    null,
                    cleanPhone,
                    req.cccdNumber() != null && !req.cccdNumber().isBlank() ? req.cccdNumber().trim() : null,
                    null,
                    Instant.now(),
                    Instant.now()
            );
            profile = patientProfileJpaRepository.save(profile);
        } else if (req.cccdNumber() != null && !req.cccdNumber().isBlank()) {
            profile.setCccdNumber(req.cccdNumber().trim());
            profile.setUpdatedAt(Instant.now());
            patientProfileJpaRepository.save(profile);
        }

        // 3. Phân bổ Bác sĩ khám
        DoctorEntity doctor = null;
        if (req.doctorId() != null && !req.doctorId().isBlank()) {
            doctor = doctorJpaRepository.findById(req.doctorId()).orElse(null);
        }
        if (doctor == null) {
            doctor = doctorJpaRepository.findAll().stream().findFirst().orElse(null);
        }

        String doctorId = doctor != null ? doctor.getId() : "10b2c3d4-0001-4000-8000-000000000001";
        String roomNumber = doctor != null && doctor.getRoomNumber() != null ? doctor.getRoomNumber() : "P.201 - Lầu 2";
        String doctorName = "BS. Chuyên Khoa Tiếp Nhận";
        if (doctor != null) {
            Optional<UserEntity> docUserOpt = userJpaRepository.findById(doctor.getUserId());
            if (docUserOpt.isPresent()) {
                String prefix = doctor.getAcademicTitle() != null && !doctor.getAcademicTitle().isBlank()
                        ? doctor.getAcademicTitle() + " "
                        : "BS. ";
                doctorName = prefix + docUserOpt.get().getFullName();
            }
        }

        // 4. Kiểm soát hạn ngạch vãng lai & tính STT hôm nay của Bác sĩ (truy vấn SQL B-tree trực tiếp)
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        Instant startOfDay = today.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Instant endOfDay = today.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();

        long walkinCount = appointmentJpaRepository.countByDoctorIdAndQueueTypeAndCreatedAtBetween(
                doctorId, QueueType.WALKIN, startOfDay, endOfDay);
        if (walkinCount >= MAX_DAILY_WALKIN_PER_DOCTOR) {
            throw new IllegalArgumentException(
                    "Bác sĩ " + doctorName + " đã tiếp nhận đủ chỉ tiêu tối đa ("
                    + MAX_DAILY_WALKIN_PER_DOCTOR
                    + " ca) bệnh nhân vãng lai trong ngày hôm nay. Vui lòng phân bổ sang bác sĩ khác hoặc đặt lịch hẹn ngày mai!");
        }

        long count = appointmentJpaRepository.countByDoctorIdAndCreatedAtBetween(doctorId, startOfDay, endOfDay);

        String queueNumber = "W-" + String.format("%02d", count + 1);
        String bookingCode = "WALK-" + (100000 + new Random().nextInt(900000));
        String specialty = req.specialty() != null && !req.specialty().isBlank() ? req.specialty() : "Khám chuyên khoa tiếp nhận tại quầy";

        // 5. Tạo AppointmentEntity thực tế vào MySQL
        AppointmentEntity app = new AppointmentEntity(
                UUID.randomUUID().toString(),
                bookingCode,
                "a1b2c3d4-0001-4000-8000-000000000001",
                profile.getId(),
                doctorId,
                null,
                queueNumber,
                QueueType.WALKIN,
                specialty,
                AppointmentStatus.CHECKED_IN,
                Instant.now(),
                Instant.now()
        );
        app.setCheckinMethod(CheckinMethod.MANUAL);
        app.setCheckInTime(Instant.now());
        app = appointmentJpaRepository.save(app);

        WalkinResponse res = new WalkinResponse(
                app.getId(),
                bookingCode,
                queueNumber,
                cleanName,
                doctorId,
                doctorName,
                roomNumber,
                specialty,
                app.getCheckInTime().toString(),
                app.getStatus().name()
        );

        return ResponseEntity.ok(res);
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

    /**
     * Tra cứu lịch sử tiếp đón & check-in bệnh nhân tại quầy lễ tân.
     */
    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<com.medsched.reception.ReceptionDtos.ReceptionHistoryResponse> getReceptionHistory(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate to) {

        return ResponseEntity.ok(receptionHistoryService.getReceptionHistory(q, method, status, from, to));
    }
}


