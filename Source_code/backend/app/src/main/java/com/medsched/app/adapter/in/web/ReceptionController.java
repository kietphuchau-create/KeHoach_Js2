package com.medsched.app.adapter.in.web;

import com.medsched.billing.BillingDtos;
import com.medsched.billing.BillingService;
import com.medsched.common.InputValidator;
import com.medsched.core.domain.exception.ResourceNotFoundException;
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
import com.medsched.persistence.entity.TimeSlotEntity;
import com.medsched.persistence.enums.SlotStatus;
import com.medsched.persistence.repository.AppointmentJpaRepository;
import com.medsched.persistence.repository.DoctorJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.TimeSlotJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/reception", "/api/reception"})
@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
public class ReceptionController {

    public static final int MAX_DAILY_WALKIN_PER_DOCTOR = 30;
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final CheckinUseCase checkinUseCase;
    private final BillingService billingService;
    private final AppointmentJpaRepository appointmentJpaRepository;
    private final PatientProfileJpaRepository patientProfileJpaRepository;
    private final AppointmentRepositoryPort appointmentRepositoryPort;
    private final UserJpaRepository userJpaRepository;
    private final DoctorJpaRepository doctorJpaRepository;
    private final TimeSlotJpaRepository timeSlotJpaRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.medsched.reception.ReceptionHistoryService receptionHistoryService;

    private Clock clock = Clock.system(VN_ZONE);

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    public ReceptionController(
            CheckinUseCase checkinUseCase,
            BillingService billingService,
            AppointmentJpaRepository appointmentJpaRepository,
            PatientProfileJpaRepository patientProfileJpaRepository,
            AppointmentRepositoryPort appointmentRepositoryPort,
            UserJpaRepository userJpaRepository,
            DoctorJpaRepository doctorJpaRepository,
            TimeSlotJpaRepository timeSlotJpaRepository,
            PasswordEncoder passwordEncoder,
            com.medsched.reception.ReceptionHistoryService receptionHistoryService) {
        this.checkinUseCase = checkinUseCase;
        this.billingService = billingService;
        this.appointmentJpaRepository = appointmentJpaRepository;
        this.patientProfileJpaRepository = patientProfileJpaRepository;
        this.appointmentRepositoryPort = appointmentRepositoryPort;
        this.userJpaRepository = userJpaRepository;
        this.doctorJpaRepository = doctorJpaRepository;
        this.timeSlotJpaRepository = timeSlotJpaRepository;
        this.passwordEncoder = passwordEncoder;
        this.receptionHistoryService = receptionHistoryService;
    }

    /**
     * CLAB-124: Ràng buộc khung giờ tiếp đón (Check-in Time Window):
     * 1. Không tiếp đón ca khám đã CANCELLED hoặc COMPLETED.
     * 2. Nếu ca khám có slot hẹn trước (slotId != null):
     *    - Chỉ được check-in vào đúng ngày hẹn (từ chối nếu slot ở tương lai chưa tới ngày hoặc slot đã quá hạn).
     *    - Đúng ngày hẹn: Cho phép check-in trước giờ khám tối đa 45 phút, và trễ tối đa 15 phút sau giờ bắt đầu slot.
     * 3. Nếu ca khám vãng lai (không gắn slot): Phải nằm trong khung giờ làm việc phòng khám.
     */
    private void validateCheckinTimeWindow(AppointmentEntity app) {
        if (app.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalArgumentException("Lịch hẹn này đã bị hủy, không thể làm thủ tục tiếp đón!");
        }
        if (app.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException("Lịch hẹn này đã hoàn tất khám bệnh trước đó!");
        }

        ZonedDateTime nowVn = clock.instant().atZone(VN_ZONE);
        LocalDate todayVn = nowVn.toLocalDate();

        if (app.getSlotId() != null) {
            TimeSlotEntity slot = timeSlotJpaRepository.findById(app.getSlotId()).orElse(null);
            if (slot != null && slot.getStartTime() != null) {
                ZonedDateTime slotStart = slot.getStartTime().atZone(VN_ZONE);
                LocalDate slotDate = slotStart.toLocalDate();

                if (slotDate.isAfter(todayVn)) {
                    throw new IllegalArgumentException(
                            "Lịch hẹn của quý khách vào ngày "
                            + slotDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            + ". Chưa đến ngày khám, vui lòng quay lại đúng ngày hẹn để làm thủ tục tiếp đón!");
                }
                if (slotDate.isBefore(todayVn)) {
                    throw new IllegalArgumentException(
                            "Lịch hẹn của quý khách vào ngày "
                            + slotDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            + " đã quá hạn từ trước. Vui lòng liên hệ nhân viên Lễ tân tại quầy để được hỗ trợ!");
                }

                // Cùng ngày hôm nay: Kiểm tra khung giờ cho phép check-in [-45 phút, +15 phút]
                ZonedDateTime earliestCheckin = slotStart.minusMinutes(45);
                ZonedDateTime latestCheckin = slotStart.plusMinutes(15);

                if (nowVn.isBefore(earliestCheckin)) {
                    throw new IllegalArgumentException(
                            "Chưa đến giờ tiếp đón cho ca hẹn lúc "
                            + slotStart.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
                            + "! Quý khách chỉ có thể check-in trước giờ khám tối đa 45 phút (bắt đầu từ "
                            + earliestCheckin.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm")) + ").");
                }
                if (nowVn.isAfter(latestCheckin)) {
                    throw new IllegalArgumentException(
                            "Đã quá thời gian tiếp đón cho ca hẹn lúc "
                            + slotStart.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
                            + " (quá hạn 15 phút sau giờ bắt đầu khám). Vui lòng gặp nhân viên Lễ tân tại quầy để được chuyển sang diện khám vãng lai!");
                }
            } else {
                validateWalkinBusinessHours();
            }
        } else {
            // Ca khám không có slot (vãng lai) -> Ràng buộc giờ làm việc hành chính
            validateWalkinBusinessHours();
        }
    }

    /**
     * CLAB-124: Ràng buộc khung giờ tiếp nhận vãng lai tại quầy:
     * - Chỉ tiếp nhận từ Thứ Hai đến Thứ Sáu (nghỉ Thứ Bảy, Chủ Nhật)
     * - Ca sáng: 08:00 - 12:00
     * - Ca chiều: 13:30 - 17:00
     * - Ngoài các khung giờ trên (nghỉ trưa 12:00-13:30, sau 17:00, cuối tuần) đều bị từ chối.
     */
    private void validateWalkinBusinessHours() {
        ZonedDateTime nowVn = clock.instant().atZone(VN_ZONE);
        DayOfWeek day = nowVn.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
            throw new IllegalArgumentException(
                    "Phòng khám không tiếp nhận bệnh nhân vào cuối tuần (Thứ Bảy & Chủ Nhật). "
                    + "Giờ làm việc: Thứ Hai - Thứ Sáu (08:00 - 12:00, 13:30 - 17:00).");
        }

        LocalTime nowTime = nowVn.toLocalTime();
        boolean morningShift = !nowTime.isBefore(LocalTime.of(8, 0)) && nowTime.isBefore(LocalTime.of(12, 0));
        boolean afternoonShift = !nowTime.isBefore(LocalTime.of(13, 30)) && nowTime.isBefore(LocalTime.of(17, 0));

        if (!morningShift && !afternoonShift) {
            throw new IllegalArgumentException(
                    "Hiện tại ngoài giờ làm việc của phòng khám. "
                    + "Quầy tiếp đón chỉ tiếp nhận bệnh nhân trong khung giờ 08:00 - 12:00 và 13:30 - 17:00 (Thứ Hai - Thứ Sáu).");
        }
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

    public record QuickBookRequest(
            String fullName,
            String phone,
            String email,
            String symptoms,
            String doctorId,
            String slotId,
            String slotTime,
            String appointmentDate,
            String specialty,
            String bookingType // "PHONE" (Khách gọi hotline) hoặc "WALKIN" (Khách tại quầy)
    ) {}

    public record QuickBookResponse(
            String appointmentId,
            String bookingCode,
            String queueNumber,
            String patientName,
            String phone,
            String email,
            String doctorId,
            String doctorName,
            String roomNumber,
            String specialtyName,
            String appointmentDate,
            String slotTime,
            String symptoms,
            String status,
            String message
    ) {}

    @PostMapping("/checkin/qr")
    @PreAuthorize("permitAll()")
    @Transactional
    public ResponseEntity<CheckinUseCase.CheckinResult> checkinByQr(@RequestBody QrCheckinRequest req) {
        String rawCode = req.bookingCode() != null ? req.bookingCode().trim() : "";
        String code = InputValidator.validateBookingCode(rawCode);
        Optional<AppointmentEntity> appOpt = appointmentJpaRepository.findByBookingCode(code);
        if (appOpt.isEmpty()) {
            appOpt = appointmentJpaRepository.findByQueueNumber(code);
        }

        if (appOpt.isPresent()) {
            AppointmentEntity app = appOpt.get();

            // Nếu bệnh nhân đã tiếp đón trước đó rồi -> Trả về kết quả mà không báo lỗi
            if (app.getStatus() == AppointmentStatus.CHECKED_IN
                    || app.getStatus() == AppointmentStatus.IN_PROGRESS
                    || app.getStatus() == AppointmentStatus.WAITING_FOR_LAB_RESULTS) {
                Appointment domain = appointmentRepositoryPort.findById(app.getId()).orElse(null);
                return ResponseEntity.ok(new CheckinUseCase.CheckinResult(
                        domain,
                        app.getQueueNumber(),
                        "Lịch hẹn này đã được tiếp đón trước đó! Bệnh nhân đang trong hàng đợi."
                ));
            }

            // Kiểm tra ràng buộc khung giờ tiếp đón (CLAB-124)
            validateCheckinTimeWindow(app);

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
        String rawCccd = req.cccdNumber() != null ? req.cccdNumber().trim() : "";
        String cccd = rawCccd.isBlank() ? "" : InputValidator.validateCccd(rawCccd);
        String fullName = req.fullName() != null && !req.fullName().isBlank() 
                ? InputValidator.validateFullName(req.fullName()) 
                : "Bệnh nhân CCCD";

        if (!cccd.isBlank()) {
            List<PatientProfileEntity> profiles = patientProfileJpaRepository.findByCccdNumber(cccd)
                    .map(List::of)
                    .orElseGet(java.util.Collections::emptyList);

            for (PatientProfileEntity profile : profiles) {
                List<AppointmentEntity> appointments = appointmentJpaRepository.findByPatientProfileIdOrderByCreatedAtDesc(profile.getId());
                ZonedDateTime nowVn = clock.instant().atZone(VN_ZONE);
                LocalDate todayVn = nowVn.toLocalDate();

                // Ưu tiên chọn ca khám đúng ngày hôm nay để làm thủ tục tiếp đón
                Optional<AppointmentEntity> activeOpt = appointments.stream()
                        .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED || a.getStatus() == AppointmentStatus.PENDING)
                        .filter(a -> {
                            if (a.getSlotId() != null) {
                                TimeSlotEntity s = timeSlotJpaRepository.findById(a.getSlotId()).orElse(null);
                                if (s != null && s.getStartTime() != null) {
                                    return s.getStartTime().atZone(VN_ZONE).toLocalDate().isEqual(todayVn);
                                }
                            }
                            return a.getCreatedAt() != null && a.getCreatedAt().atZone(VN_ZONE).toLocalDate().isEqual(todayVn);
                        })
                        .findFirst();

                // Nếu không có ca đúng ngày hôm nay, lấy ca active gần nhất để validateCheckinTimeWindow thông báo lý do chính xác
                if (activeOpt.isEmpty()) {
                    activeOpt = appointments.stream()
                            .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED || a.getStatus() == AppointmentStatus.PENDING)
                            .findFirst();
                }

                if (activeOpt.isPresent()) {
                    AppointmentEntity app = activeOpt.get();
                    // Kiểm tra ràng buộc khung giờ tiếp đón (CLAB-124)
                    validateCheckinTimeWindow(app);

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

            // Trường hợp khách chưa có lịch hẹn đặt trước: Tự động tạo ca khám vãng lai tiếp nhận vào MySQL (CLAB-124: Ràng buộc giờ hành chính)
            validateWalkinBusinessHours();

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
        // CLAB-124: Ràng buộc khung giờ tiếp nhận vãng lai tại quầy
        validateWalkinBusinessHours();

        String cleanPhone = InputValidator.validatePhone(req.phone());
        String cleanName = InputValidator.validateFullName(req.fullName());
        String cccdNumber = req.cccdNumber() != null && !req.cccdNumber().isBlank()
                ? InputValidator.validateCccd(req.cccdNumber())
                : null;
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
                    cccdNumber,
                    null,
                    Instant.now(),
                    Instant.now()
            );
            profile = patientProfileJpaRepository.save(profile);
        } else if (cccdNumber != null) {
            profile.setCccdNumber(cccdNumber);
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
     * CLAB-115: Đặt lịch khám nhanh qua điện thoại & tiếp đón tại quầy từ Bảng Điều Phối Lịch Toàn Viện.
     * Hỗ trợ lưu triệu chứng ngắn gọn, tự động liên kết slot giờ khám và khóa slot thành BOOKED.
     */
    @PostMapping("/quick-book")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    @Transactional
    public ResponseEntity<QuickBookResponse> quickBookAppointment(@RequestBody QuickBookRequest req) {
        // 0. Ràng buộc từng ký tự đầu vào từ client (CLAB-117)
        String cleanPhone = InputValidator.validatePhone(req.phone());
        String cleanName = InputValidator.validateFullName(req.fullName());
        String rawEmail = InputValidator.validateEmail(req.email());
        String symptoms = InputValidator.validateSymptoms(req.symptoms());
        String bookingType = req.bookingType() != null && req.bookingType().equalsIgnoreCase("WALKIN") ? "WALKIN" : "PHONE";
        if ("WALKIN".equals(bookingType)) {
            validateWalkinBusinessHours();
        }

        if (req.appointmentDate() != null && !req.appointmentDate().isBlank()) {
            InputValidator.validateIsoDate(req.appointmentDate());
        }
        if (req.slotTime() != null && !req.slotTime().isBlank()) {
            InputValidator.validateSlotTime(req.slotTime());
        }

        // 1. Tìm hoặc tạo User (hỗ trợ nhập email/gmail của người bệnh)
        String resolvedEmail = rawEmail != null ? rawEmail : cleanPhone + "@medsched.vn";
        UserEntity user = userJpaRepository.findByPhone(cleanPhone).orElse(null);
        if (user == null && rawEmail != null) {
            user = userJpaRepository.findByEmail(rawEmail).orElse(null);
        }
        if (user == null) {
            user = userJpaRepository.findByEmail(resolvedEmail).orElse(null);
        }
        if (user == null) {
            String defaultPass = cleanPhone.length() >= 4 ? "Med@" + cleanPhone.substring(cleanPhone.length() - 4) : "Med@1234";
            user = new UserEntity(
                    UUID.randomUUID().toString(),
                    resolvedEmail,
                    passwordEncoder.encode(defaultPass),
                    cleanName,
                    cleanPhone,
                    true,
                    Instant.now(),
                    Instant.now()
            );
            user.setCurrentSessionId(UUID.randomUUID().toString());
            user = userJpaRepository.save(user);
        } else {
            // Cập nhật email nếu người bệnh cung cấp email/gmail mới
            if (rawEmail != null && (user.getEmail() == null || user.getEmail().endsWith("@medsched.vn"))) {
                user.setEmail(rawEmail);
                user.setUpdatedAt(Instant.now());
                user = userJpaRepository.save(user);
            }
        }

        // 2. Tìm hoặc tạo Hồ sơ Bệnh nhân (PatientProfileEntity)
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
                    null,
                    null,
                    Instant.now(),
                    Instant.now()
            );
            profile = patientProfileJpaRepository.save(profile);
        }

        // 3. Tìm Bác sĩ phụ trách
        DoctorEntity doctor = null;
        if (req.doctorId() != null && !req.doctorId().isBlank()) {
            doctor = doctorJpaRepository.findById(req.doctorId()).orElse(null);
        }
        if (doctor == null) {
            doctor = doctorJpaRepository.findAll().stream().findFirst().orElse(null);
        }

        String doctorId = doctor != null ? doctor.getId() : "10b2c3d4-0001-4000-8000-000000000001";
        String roomNumber = doctor != null && doctor.getRoomNumber() != null ? doctor.getRoomNumber() : "P.205 - Tầng 2";
        String doctorName = "BS. Chuyên Khoa";
        if (doctor != null) {
            Optional<UserEntity> docUserOpt = userJpaRepository.findById(doctor.getUserId());
            if (docUserOpt.isPresent()) {
                String prefix = doctor.getAcademicTitle() != null && !doctor.getAcademicTitle().isBlank()
                        ? doctor.getAcademicTitle() + " "
                        : "BS. ";
                doctorName = prefix + docUserOpt.get().getFullName();
            }
        }

        // 4. Liên kết & Khóa Slot Khám (Đánh dấu BOOKED)
        String slotId = null;
        String slotTimeStr = req.slotTime() != null ? req.slotTime().trim() : "";
        if (req.slotId() != null && !req.slotId().isBlank()) {
            TimeSlotEntity slot = timeSlotJpaRepository.findById(req.slotId())
                    .orElseThrow(() -> new ResourceNotFoundException("Khung giờ khám không tồn tại: " + req.slotId()));
            if (slot.getStatus() != SlotStatus.AVAILABLE) {
                throw new IllegalArgumentException("Khung giờ này đã có người đặt hoặc tạm khóa. Vui lòng chọn khung giờ khác.");
            }
            if (slot.getStartTime().isBefore(Instant.now())) {
                throw new IllegalArgumentException("Không thể đặt khung giờ đã trôi qua trong quá khứ.");
            }
            slot.setStatus(SlotStatus.BOOKED);
            slot.setUpdatedAt(Instant.now());
            timeSlotJpaRepository.save(slot);
            slotId = slot.getId();
        } else if (!slotTimeStr.isBlank() && req.appointmentDate() != null) {
            try {
                LocalDate targetDate = LocalDate.parse(req.appointmentDate());
                ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
                Instant dayStart = targetDate.atStartOfDay(vnZone).toInstant();
                Instant dayEnd = targetDate.atTime(23, 59, 59).atZone(vnZone).toInstant();
                List<TimeSlotEntity> slots = timeSlotJpaRepository.findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(
                        doctorId, dayStart, dayEnd);
                String startPart = slotTimeStr.split("-")[0].trim();
                for (TimeSlotEntity s : slots) {
                    String sTime = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
                            .withZone(vnZone).format(s.getStartTime());
                    if (sTime.equals(startPart)) {
                        if (s.getStatus() != SlotStatus.AVAILABLE) {
                            throw new IllegalArgumentException("Khung giờ khám (" + slotTimeStr + ") đã có người đặt trước.");
                        }
                        if (s.getStartTime().isBefore(Instant.now())) {
                            throw new IllegalArgumentException("Không thể đặt khung giờ đã trôi qua trong quá khứ.");
                        }
                        s.setStatus(SlotStatus.BOOKED);
                        s.setUpdatedAt(Instant.now());
                        timeSlotJpaRepository.save(s);
                        slotId = s.getId();
                        break;
                    }
                }
            } catch (IllegalArgumentException e) {
                throw e;
            } catch (Exception ignored) {}
        }

        // 5. Tính số thứ tự và mã lịch hẹn
        LocalDate targetDate = req.appointmentDate() != null && !req.appointmentDate().isBlank()
                ? LocalDate.parse(req.appointmentDate())
                : LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        Instant startOfDay = targetDate.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Instant endOfDay = targetDate.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        long count = appointmentJpaRepository.countByDoctorIdAndCreatedAtBetween(doctorId, startOfDay, endOfDay);

        String bookingCode;
        String queueNumber;
        AppointmentStatus status;
        QueueType queueType;
        Instant checkInTime = null;

        if ("WALKIN".equals(bookingType)) {
            bookingCode = "WALK-" + (100000 + new Random().nextInt(900000));
            queueNumber = "W-" + String.format("%02d", count + 1);
            status = AppointmentStatus.CHECKED_IN;
            queueType = QueueType.WALKIN;
            checkInTime = Instant.now();
        } else {
            bookingCode = "TEL-" + (100000 + new Random().nextInt(900000));
            queueNumber = "A-" + String.format("%02d", count + 1);
            status = AppointmentStatus.CONFIRMED;
            queueType = QueueType.ONLINE_BOOKED;
        }

        String specialty = req.specialty() != null && !req.specialty().isBlank() ? req.specialty() : "Khám chuyên khoa";

        // 6. Tạo AppointmentEntity
        AppointmentEntity app = new AppointmentEntity(
                UUID.randomUUID().toString(),
                bookingCode,
                "a1b2c3d4-0001-4000-8000-000000000001",
                profile.getId(),
                doctorId,
                slotId,
                queueNumber,
                queueType,
                symptoms,
                status,
                Instant.now(),
                Instant.now()
        );
        app.setCheckinMethod(CheckinMethod.MANUAL);
        if (checkInTime != null) {
            app.setCheckInTime(checkInTime);
        }
        app = appointmentJpaRepository.save(app);

        String displayDate = targetDate.toString();
        String successMsg = "WALKIN".equals(bookingType)
                ? "Tiếp đón và phát số khám #" + queueNumber + " thành công cho bệnh nhân " + cleanName + " tại buồng khám " + roomNumber + "."
                : "Đặt lịch khám qua điện thoại thành công cho bệnh nhân " + cleanName + " (" + cleanPhone + ") vào khung giờ " + slotTimeStr + ", ngày " + displayDate + ". Mã hẹn: " + bookingCode;

        QuickBookResponse response = new QuickBookResponse(
                app.getId(),
                bookingCode,
                queueNumber,
                cleanName,
                cleanPhone,
                user.getEmail(),
                doctorId,
                doctorName,
                roomNumber,
                specialty,
                displayDate,
                slotTimeStr,
                symptoms,
                app.getStatus().name(),
                successMsg
        );

        return ResponseEntity.ok(response);
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


