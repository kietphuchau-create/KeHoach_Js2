package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.security.AppUserDetails;
import com.medsched.security.AppUserDetailsService;
import com.medsched.security.JwtService;
import com.medsched.mail.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Quản lý quy trình đăng ký tài khoản 2 bước qua mã OTP 4 số (Email Brevo / Gmail).
 */
@Service
public class RegistrationOtpService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationOtpService.class);
    private static final int OTP_EXPIRES_SECONDS = 120; // 2 phút
    private static final int RESEND_COOLDOWN_SECONDS = 60; // 1 phút
    private static final int MAX_ATTEMPTS = 3;

    private final UserJpaRepository users;
    private final PatientProfileJpaRepository patientProfiles;
    private final PasswordEncoder passwordEncoder;
    private final AppUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    // Cache lưu trữ các phiên đăng ký tạm thời
    private final Map<String, OtpSession> sessionCache = new ConcurrentHashMap<>();

    public RegistrationOtpService(UserJpaRepository users,
                                  PatientProfileJpaRepository patientProfiles,
                                  PasswordEncoder passwordEncoder,
                                  AppUserDetailsService userDetailsService,
                                  JwtService jwtService,
                                  @Qualifier("otpEmailService") EmailService emailService) {
        this.users = users;
        this.patientProfiles = patientProfiles;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }

    /**
     * Bản ghi phiên đăng ký tạm thời.
     */
    public record OtpSession(
            String sessionToken,
            String fullName,
            String email,
            String phone,
            String encodedPassword,
            String otpCode,
            int attemptsLeft,
            Instant expiresAt,
            Instant resendAvailableAt
    ) {
        public OtpSession withNewOtp(String newOtpCode, Instant newExpiresAt, Instant newResendAt) {
            return new OtpSession(sessionToken, fullName, email, phone, encodedPassword, newOtpCode, MAX_ATTEMPTS, newExpiresAt, newResendAt);
        }

        public OtpSession withDecreasedAttempt() {
            return new OtpSession(sessionToken, fullName, email, phone, encodedPassword, otpCode, attemptsLeft - 1, expiresAt, resendAvailableAt);
        }
    }

    /**
     * BƯỚC 1: Yêu cầu gửi mã OTP.
     */
    public RegistrationOtpDtos.RequestOtpResponse requestOtp(RegistrationOtpDtos.RequestOtpRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new AppExceptions.ConflictException("Email này đã được đăng ký tài khoản");
        }

        String fullName = request.fullName().trim();
        String phone = request.phone().trim();

        // Kiểm tra an toàn mật khẩu (không chứa thông tin cá nhân)
        validatePasswordSecurity(request.password(), fullName, phone, email);

        // Sinh mã OTP 4 số ngẫu nhiên (1000 - 9999)
        String otpCode = String.format("%04d", 1000 + secureRandom.nextInt(9000));
        String sessionToken = UUID.randomUUID().toString();
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(OTP_EXPIRES_SECONDS);
        Instant resendAvailableAt = now.plusSeconds(RESEND_COOLDOWN_SECONDS);

        // Mã hóa mật khẩu ngay trước khi lưu vào phiên tạm
        String encodedPassword = passwordEncoder.encode(request.password());

        OtpSession session = new OtpSession(
                sessionToken,
                fullName,
                email,
                phone,
                encodedPassword,
                otpCode,
                MAX_ATTEMPTS,
                expiresAt,
                resendAvailableAt
        );

        sessionCache.put(sessionToken, session);

        // Gửi email OTP thật qua Brevo API / Gmail SMTP
        try {
            emailService.sendOtpEmail(email, fullName, otpCode);
        } catch (Exception ex) {
            log.warn("⚠️ Không thể gửi email OTP thật tới {}: {}", email, ex.getMessage());
        }

        // Log ra console máy chủ để theo dõi / kiểm thử
        log.info("════════════════════════════════════════════════════════════");
        log.info("📧 [MEDSCHED EMAIL OTP] Gửi mã xác thực tới Email: {}", email);
        log.info("🔑 Mã OTP 4 chữ số: [{}] (Hiệu lực 120s)", otpCode);
        log.info("════════════════════════════════════════════════════════════");

        return new RegistrationOtpDtos.RequestOtpResponse(
                sessionToken,
                maskPhone(phone),
                maskEmail(email),
                OTP_EXPIRES_SECONDS,
                RESEND_COOLDOWN_SECONDS,
                otpCode,
                "Mã xác thực 4 chữ số đã được gửi tới email " + maskEmail(email) + ". Vui lòng kiểm tra hộp thư."
        );
    }

    /**
     * BƯỚC 2: Xác thực mã OTP và chính thức lưu tài khoản vào CSDL.
     */
    @Transactional
    public AuthDtos.AuthResponse verifyOtp(RegistrationOtpDtos.VerifyOtpRequest request) {
        OtpSession session = sessionCache.get(request.sessionToken());
        if (session == null) {
            throw new AppExceptions.BadRequestException("Phiên đăng ký không tồn tại hoặc đã hết hạn. Vui lòng đăng ký lại.");
        }

        Instant now = Instant.now();
        if (session.expiresAt().isBefore(now)) {
            sessionCache.remove(request.sessionToken());
            throw new AppExceptions.BadRequestException("Mã xác thực đã hết hạn (quá 2 phút). Vui lòng yêu cầu gửi lại mã.");
        }

        if (session.attemptsLeft() <= 0) {
            sessionCache.remove(request.sessionToken());
            throw new AppExceptions.BadRequestException("Bạn đã nhập sai quá 3 lần. Phiên xác thực bị hủy để bảo đảm an toàn.");
        }

        // Kiểm tra mã OTP
        if (!session.otpCode().equals(request.otpCode().trim())) {
            OtpSession updated = session.withDecreasedAttempt();
            sessionCache.put(request.sessionToken(), updated);
            int remaining = updated.attemptsLeft();
            if (remaining > 0) {
                throw new AppExceptions.BadRequestException("Mã xác thực không đúng. Bạn còn lại " + remaining + " lần thử.");
            } else {
                sessionCache.remove(request.sessionToken());
                throw new AppExceptions.BadRequestException("Bạn đã nhập sai quá số lần cho phép (3 lần). Vui lòng thực hiện đăng ký lại.");
            }
        }

        // OTP chính xác -> Xóa phiên tạm chống Replay Attack
        sessionCache.remove(request.sessionToken());

        // Kiểm tra lại tính duy nhất của email trước khi ghi DB (phòng trường hợp race condition)
        if (users.existsByEmail(session.email())) {
            throw new AppExceptions.ConflictException("Email này đã được đăng ký tài khoản");
        }

        // Tạo UserEntity chính thức
        UserEntity user = new UserEntity(
                UUID.randomUUID().toString(),
                session.email(),
                session.encodedPassword(),
                session.fullName(),
                session.phone(),
                true,
                now,
                now
        );
        String sessionId = UUID.randomUUID().toString();
        user.setCurrentSessionId(sessionId);
        users.save(user);

        // Tạo hồ sơ bệnh nhân SELF
        PatientProfileEntity self = new PatientProfileEntity(
                UUID.randomUUID().toString(),
                user.getId(),
                RelationshipType.SELF,
                session.fullName(),
                null,
                null,
                null,
                null,
                session.phone(),
                null,
                null,
                now,
                now
        );
        patientProfiles.save(self);

        log.info("✅ [MEDSCHED REGISTRATION] Đăng ký thành công cho bệnh nhân: {} ({})", user.getFullName(), user.getEmail());

        return issueTokens(userDetailsService.loadUserById(user.getId()), user.getFullName(), sessionId);
    }

    /**
     * BƯỚC 3: Gửi lại mã OTP mới.
     */
    public RegistrationOtpDtos.ResendOtpResponse resendOtp(RegistrationOtpDtos.ResendOtpRequest request) {
        OtpSession session = sessionCache.get(request.sessionToken());
        if (session == null) {
            throw new AppExceptions.BadRequestException("Phiên đăng ký không tồn tại hoặc đã hết hạn. Vui lòng đăng ký lại.");
        }

        Instant now = Instant.now();
        if (session.resendAvailableAt().isAfter(now)) {
            long remainingSeconds = Duration.between(now, session.resendAvailableAt()).getSeconds() + 1;
            throw new AppExceptions.BadRequestException("Vui lòng đợi thêm " + remainingSeconds + " giây để yêu cầu gửi lại mã.");
        }

        // Sinh mã OTP mới
        String newOtp = String.format("%04d", 1000 + secureRandom.nextInt(9000));
        Instant newExpiresAt = now.plusSeconds(OTP_EXPIRES_SECONDS);
        Instant newResendAt = now.plusSeconds(RESEND_COOLDOWN_SECONDS);

        OtpSession updated = session.withNewOtp(newOtp, newExpiresAt, newResendAt);
        sessionCache.put(request.sessionToken(), updated);

        // Gửi email OTP
        try {
            emailService.sendOtpEmail(session.email(), session.fullName(), newOtp);
        } catch (Exception ex) {
            log.warn("⚠️ Không thể gửi lại email OTP thật tới {}: {}", session.email(), ex.getMessage());
        }

        log.info("════════════════════════════════════════════════════════════");
        log.info("📧 [MEDSCHED EMAIL OTP RESEND] Gửi lại mã tới: {}", session.email());
        log.info("🔑 Mã OTP 4 chữ số mới: [{}] (Hiệu lực 120s)", newOtp);
        log.info("════════════════════════════════════════════════════════════");

        return new RegistrationOtpDtos.ResendOtpResponse(
                "Mã xác thực mới đã được gửi tới email " + maskEmail(session.email()),
                OTP_EXPIRES_SECONDS,
                RESEND_COOLDOWN_SECONDS,
                newOtp
        );
    }

    /**
     * Tự động dọn dẹp các session hết hạn mỗi 60 giây.
     */
    @Scheduled(fixedRate = 60000)
    public void evictExpiredSessions() {
        Instant now = Instant.now();
        sessionCache.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    private AuthDtos.AuthResponse issueTokens(AppUserDetails principal, String fullName, String sessionId) {
        return new AuthDtos.AuthResponse(
                "Bearer",
                jwtService.generateAccessToken(principal.getUserId(), principal.getEmail(), principal.getRoleNames(), sessionId),
                jwtService.generateRefreshToken(principal.getUserId(), sessionId),
                jwtService.accessTtlSeconds(),
                principal.getUserId(),
                principal.getEmail(),
                fullName,
                principal.getRoleNames()
        );
    }

    private void validatePasswordSecurity(String password, String fullName, String phone, String email) {
        String lowerPwd = password.toLowerCase();

        // 1. Không trùng với số điện thoại
        if (phone != null && phone.length() >= 6 && lowerPwd.contains(phone)) {
            throw new AppExceptions.BadRequestException("Mật khẩu không được chứa số điện thoại của bạn");
        }

        // 2. Không chứa email name
        String emailPrefix = email.split("@")[0].toLowerCase();
        if (emailPrefix.length() >= 3 && lowerPwd.contains(emailPrefix)) {
            throw new AppExceptions.BadRequestException("Mật khẩu không được chứa tên tài khoản email");
        }

        // 3. Không chứa các từ trong tên của người dùng (nếu từ dài >= 3 ký tự)
        String[] nameParts = fullName.toLowerCase().split("\\s+");
        for (String part : nameParts) {
            if (part.length() >= 3 && lowerPwd.contains(part)) {
                throw new AppExceptions.BadRequestException("Mật khẩu không được chứa họ tên của bạn");
            }
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 4) + "***" + phone.substring(phone.length() - 3);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        String[] parts = email.split("@", 2);
        String name = parts[0];
        String domain = parts[1];
        if (name.length() <= 2) {
            return name.charAt(0) + "***@" + domain;
        }
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + "@" + domain;
    }
}
