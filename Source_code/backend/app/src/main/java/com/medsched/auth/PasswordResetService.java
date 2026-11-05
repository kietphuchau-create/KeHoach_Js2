package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.mail.EmailService;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.repository.UserJpaRepository;
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
 * Xử lý nghiệp vụ Khôi phục mật khẩu qua Email OTP / Secure Token (REQ-AUTH-05 - SRS Chương 5 & 10).
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    public static final int EXPIRATION_MINUTES = 15;

    private final UserJpaRepository users;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    // Cache lưu trữ token & OTP reset password trong bộ nhớ (hết hạn sau 15 phút)
    private final Map<String, ResetSession> sessionCache = new ConcurrentHashMap<>();

    public record ResetSession(
            String token,
            String otpCode,
            String userId,
            String email,
            Instant expiresAt
    ) {
        public boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    public PasswordResetService(UserJpaRepository users,
                                PasswordEncoder passwordEncoder,
                                @Qualifier("otpEmailService") EmailService emailService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    /**
     * BƯỚC 1: Tiếp nhận yêu cầu quên mật khẩu, sinh OTP 6 số và Token bảo mật, gửi email.
     */
    @Transactional(readOnly = true)
    public PasswordResetDtos.ForgotPasswordResponse processForgotPassword(PasswordResetDtos.ForgotPasswordRequest request) {
        String normalizedEmail = request.email() != null ? request.email().trim().toLowerCase() : "";
        UserEntity user = users.findByEmail(normalizedEmail)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản với email: " + request.email()));

        // Sinh token ngẫu nhiên và mã OTP 6 số bảo mật
        String token = UUID.randomUUID().toString().replace("-", "");
        String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(EXPIRATION_MINUTES));

        ResetSession session = new ResetSession(token, otpCode, user.getId(), user.getEmail(), expiresAt);
        // Cho phép tra cứu bằng cả Token URL lẫn mã OTP 6 chữ số
        sessionCache.put(token, session);
        sessionCache.put(otpCode, session);

        log.info("🔑 [PasswordReset] Đã tạo mã khôi phục cho email {}: OTP={}, Token={} (Hết hạn lúc {})",
                user.getEmail(), otpCode, token, expiresAt);

        // Gửi email chứa liên kết và OTP
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), token, otpCode);
        } catch (Exception ex) {
            log.warn("⚠️ [PasswordReset] Không thể gửi email thông báo: {}", ex.getMessage());
        }

        return new PasswordResetDtos.ForgotPasswordResponse(
                "Mã xác thực và liên kết đặt lại mật khẩu đã được gửi đến email của bạn.",
                user.getEmail(),
                EXPIRATION_MINUTES
        );
    }

    /**
     * BƯỚC 2: Kiểm tra OTP / Token và cập nhật mật khẩu mới băm BCrypt.
     */
    @Transactional
    public PasswordResetDtos.ResetPasswordResponse processResetPassword(PasswordResetDtos.ResetPasswordRequest request) {
        String key = request.token() != null ? request.token().trim() : "";
        ResetSession session = sessionCache.get(key);

        if (session == null || session.isExpired()) {
            if (session != null) {
                sessionCache.remove(session.token());
                sessionCache.remove(session.otpCode());
            }
            throw new AppExceptions.BadRequestException("Mã xác thực hoặc liên kết không hợp lệ hoặc đã hết hạn (hiệu lực 15 phút). Vui lòng yêu cầu lại.");
        }

        UserEntity user = users.findById(session.userId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản người dùng"));

        // Cập nhật mật khẩu mới băm BCrypt
        user.setPasswordHash(passwordEncoder.encode(request.newPassword().trim()));
        user.setUpdatedAt(Instant.now());

        // Đổi session ID để vô hiệu hóa toàn bộ phiên đăng nhập cũ trên mọi thiết bị
        user.setCurrentSessionId(UUID.randomUUID().toString());
        users.save(user);

        // Vô hiệu hóa ngay token & OTP đã sử dụng
        sessionCache.remove(session.token());
        sessionCache.remove(session.otpCode());

        log.info("✅ [PasswordReset] Đặt lại mật khẩu thành công cho tài khoản: {}", user.getEmail());

        return new PasswordResetDtos.ResetPasswordResponse(
                "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới."
        );
    }

    /**
     * Tự động dọn dẹp các phiên hết hạn khỏi bộ nhớ mỗi 5 phút.
     */
    @Scheduled(fixedRate = 300_000)
    public void cleanupExpiredSessions() {
        sessionCache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    // Phương thức hỗ trợ kiểm thử
    public boolean hasActiveSession(String key) {
        ResetSession s = sessionCache.get(key);
        return s != null && !s.isExpired();
    }
}

