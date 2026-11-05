package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.mail.EmailService;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.enums.UserRole;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.persistence.repository.UserMedicalCenterRoleJpaRepository;
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
 * Lưu ý nghiệp vụ: Chỉ áp dụng cho tài khoản Bệnh nhân. Cán bộ nhân viên (Bác sĩ, Lễ tân, Admin)
 * bắt buộc phải liên hệ Quản trị viên (Admin) để được cấp lại mật khẩu tập trung nhằm bảo vệ hồ sơ bệnh án.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    public static final int EXPIRATION_MINUTES = 15;

    private final UserJpaRepository users;
    private final UserMedicalCenterRoleJpaRepository centerRoles;
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
                                UserMedicalCenterRoleJpaRepository centerRoles,
                                PasswordEncoder passwordEncoder,
                                @Qualifier("otpEmailService") EmailService emailService) {
        this.users = users;
        this.centerRoles = centerRoles;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    /**
     * BƯỚC 1: Tiếp nhận yêu cầu quên mật khẩu, sinh OTP 6 số và Token bảo mật, gửi email.
     * Chặn Bác sĩ / Lễ tân / Admin và chỉ cho phép Bệnh nhân.
     */
    @Transactional(readOnly = true)
    public PasswordResetDtos.ForgotPasswordResponse processForgotPassword(PasswordResetDtos.ForgotPasswordRequest request) {
        String normalizedEmail = request.email() != null ? request.email().trim().toLowerCase() : "";
        UserEntity user = users.findByEmail(normalizedEmail)
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản với email: " + request.email()));

        // Kiểm tra phân quyền: Quên mật khẩu tự động chỉ áp dụng cho Bệnh nhân (Customer)
        // Cán bộ nhân viên (Bác sĩ, Lễ tân, Quản trị viên) bắt buộc phải liên hệ Admin để đổi nhằm bảo vệ hồ sơ bệnh án
        boolean isStaffOrDoctorOrAdmin = centerRoles.findByUserIdAndActiveTrue(user.getId()).stream()
                .anyMatch(r -> r.getRole() == UserRole.ROLE_DOCTOR
                            || r.getRole() == UserRole.ROLE_STAFF
                            || r.getRole() == UserRole.ROLE_ADMIN);

        if (isStaffOrDoctorOrAdmin) {
            log.warn("⛔ [PasswordReset] Từ chối khôi phục mật khẩu tự động cho nhân sự nội bộ: {}", user.getEmail());
            throw new AppExceptions.BadRequestException(
                    "Tính năng tự khôi phục mật khẩu qua Email chỉ áp dụng cho Bệnh nhân. " +
                    "Bác sĩ và Nhân viên y tế vui lòng liên hệ Quản trị viên (Admin) để được cấp lại mật khẩu theo quy trình bảo mật hồ sơ bệnh án."
            );
        }

        // Sinh token ngẫu nhiên và mã OTP 6 số bảo mật
        String token = UUID.randomUUID().toString().replace("-", "");
        String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(EXPIRATION_MINUTES));

        ResetSession session = new ResetSession(token, otpCode, user.getId(), user.getEmail(), expiresAt);
        // Cho phép tra cứu bằng cả Token URL lẫn mã OTP 6 chữ số
        sessionCache.put(token, session);
        sessionCache.put(otpCode, session);

        log.info("🔑 [PasswordReset] Đã tạo mã khôi phục cho email Bệnh nhân {}: OTP={}, Token={} (Hết hạn lúc {})",
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

        // Cập nhật mật khẩu mới băm BCrypt & mở khóa tài khoản nếu đang bị khóa (REQ-AUTH-02)
        user.setPasswordHash(passwordEncoder.encode(request.newPassword().trim()));
        user.setActive(true);
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
