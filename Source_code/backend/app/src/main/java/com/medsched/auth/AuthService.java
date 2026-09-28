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
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import com.medsched.common.EmailService;
import com.medsched.persistence.entity.PasswordResetTokenEntity;
import com.medsched.persistence.entity.RevokedTokenEntity;
import com.medsched.persistence.repository.PasswordResetTokenJpaRepository;
import com.medsched.persistence.repository.RevokedTokenJpaRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserJpaRepository users;
    private final PatientProfileJpaRepository patientProfiles;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AppUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final PasswordResetTokenJpaRepository passwordResetTokens;
    private final RevokedTokenJpaRepository revokedTokens;
    private final EmailService emailService;

    public AuthService(UserJpaRepository users,
                       PatientProfileJpaRepository patientProfiles,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       AppUserDetailsService userDetailsService,
                       JwtService jwtService,
                       PasswordResetTokenJpaRepository passwordResetTokens,
                       RevokedTokenJpaRepository revokedTokens,
                       EmailService emailService) {
        this.users = users;
        this.patientProfiles = patientProfiles;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.passwordResetTokens = passwordResetTokens;
        this.revokedTokens = revokedTokens;
        this.emailService = emailService;
    }

    /**
     * Đăng ký tài khoản bệnh nhân. Tài khoản mới KHÔNG được cấp dòng nào trong
     * {@code user_medical_center_roles} - đúng thiết kế bản 3.0: mọi tài khoản
     * mặc định đặt lịch khám được ở mọi chi nhánh mà không cần quyền nhân sự.
     * <p>
     * Đồng thời tạo sẵn hồ sơ người khám {@code SELF} để bệnh nhân đặt lịch
     * được ngay, không phải khai báo thêm một bước.
     */
    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new AppExceptions.ConflictException("Email này đã được đăng ký");
        }

        Instant now = Instant.now();
        String fullName = request.fullName().trim();
        String phone = blankToNull(request.phone());

        UserEntity user = new UserEntity(UUID.randomUUID().toString(), email,
                passwordEncoder.encode(request.password()), fullName, phone, true, now, now);
        users.save(user);

        PatientProfileEntity self = new PatientProfileEntity(UUID.randomUUID().toString(), user.getId(),
                RelationshipType.SELF, fullName, null, null, null, null, phone, null, null, now, now);
        patientProfiles.save(self);

        return issueTokens(userDetailsService.loadUserById(user.getId()), user.getFullName());
    }

    /** Đăng nhập dùng chung cho Customer / Doctor / Staff / Admin. */
    @Transactional(readOnly = true)
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        // Sai email/mật khẩu -> BadCredentialsException; tài khoản bị khóa ->
        // DisabledException. Cả hai được GlobalExceptionHandler dịch sang thông
        // báo tiếng Việt phù hợp.
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizeEmail(request.email()), request.password()));
        AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
        UserEntity user = users.findById(principal.getUserId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));
        return issueTokens(principal, user.getFullName());
    }

    /**
     * Đổi refresh token còn hiệu lực thành cặp token mới (xoay vòng token).
     * Quyền được nạp lại từ DB nên nếu Admin vừa thu hồi quyền thì access token
     * mới sẽ không còn quyền đó.
     */
    @Transactional(readOnly = true)
    public AuthDtos.AuthResponse refresh(AuthDtos.RefreshRequest request) {
        Claims claims;
        try {
            claims = jwtService.parse(request.refreshToken());
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AppExceptions.BadRequestException("Refresh token không hợp lệ hoặc đã hết hạn");
        }
        if (!jwtService.isType(claims, JwtService.TYPE_REFRESH)) {
            throw new AppExceptions.BadRequestException("Token gửi lên không phải refresh token");
        }

        AppUserDetails principal = userDetailsService.loadUserById(claims.getSubject());
        if (!principal.isEnabled()) {
            throw new AppExceptions.BadRequestException("Tài khoản đã bị khóa");
        }
        UserEntity user = users.findById(principal.getUserId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));
        return issueTokens(principal, user.getFullName());
    }

    /**
     * Quên mật khẩu: Người dùng nhập email.
     * Trả về thông báo thành công đồng nhất dù email có tồn tại hay không (chống dò quét email).
     * Nếu email tồn tại, sinh token bảo mật thời hạn 15 phút và gửi liên kết đặt lại mật khẩu.
     */
    @Transactional
    public AuthDtos.SimpleMessageResponse forgotPassword(AuthDtos.ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        var userOpt = users.findByEmail(email);
        if (userOpt.isPresent()) {
            UserEntity user = userOpt.get();
            if (user.isActive()) {
                String rawToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
                String tokenHash = JwtService.sha256Hex(rawToken);
                Instant now = Instant.now();
                Instant expiresAt = now.plus(Duration.ofMinutes(15));
                PasswordResetTokenEntity tokenEntity = new PasswordResetTokenEntity(
                        UUID.randomUUID().toString(),
                        user.getId(),
                        tokenHash,
                        expiresAt,
                        null,
                        now
                );
                passwordResetTokens.save(tokenEntity);
                emailService.sendPasswordResetEmail(user.getEmail(), rawToken);
            }
        }
        return new AuthDtos.SimpleMessageResponse(
                "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn.");
    }

    /**
     * Đặt lại mật khẩu bằng token một lần.
     * Cập nhật mật khẩu mới và vô hiệu hoá toàn bộ phiên làm việc / token trước đó.
     */
    @Transactional
    public AuthDtos.SimpleMessageResponse resetPassword(AuthDtos.ResetPasswordRequest request) {
        String tokenHash = JwtService.sha256Hex(request.token().trim());
        PasswordResetTokenEntity tokenEntity = passwordResetTokens.findByTokenHash(tokenHash)
                .orElseThrow(() -> new AppExceptions.BadRequestException("Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"));

        if (!tokenEntity.isValid()) {
            throw new AppExceptions.BadRequestException("Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
        }

        UserEntity user = users.findById(tokenEntity.getUserId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));

        Instant now = Instant.now();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        // Vô hiệu hoá tất cả các phiên / token đã phát hành trước thời điểm này
        user.setTokenInvalidBefore(now);
        user.setUpdatedAt(now);
        user.setUpdatedBy(user.getId());
        users.save(user);

        // Đánh dấu token đã dùng
        tokenEntity.setUsedAt(now);
        passwordResetTokens.save(tokenEntity);

        return new AuthDtos.SimpleMessageResponse("Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.");
    }

    /**
     * Đăng xuất & thu hồi token phía Server (Server-side Invalidation).
     * Lưu hash của access token (và refresh token nếu có) vào danh sách thu hồi.
     */
    @Transactional
    public AuthDtos.SimpleMessageResponse logout(String bearerToken, AuthDtos.LogoutRequest request, AppUserDetails principal) {
        Instant now = Instant.now();
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            String accessToken = bearerToken.substring(7);
            try {
                Claims claims = jwtService.parse(accessToken);
                Instant expiry = claims.getExpiration() != null ? claims.getExpiration().toInstant() : now.plus(Duration.ofHours(1));
                String hash = JwtService.sha256Hex(accessToken);
                if (!revokedTokens.existsByTokenHash(hash)) {
                    revokedTokens.save(new RevokedTokenEntity(
                            UUID.randomUUID().toString(),
                            hash,
                            JwtService.TYPE_ACCESS,
                            principal != null ? principal.getUserId() : claims.getSubject(),
                            expiry,
                            now
                    ));
                }
            } catch (Exception ignored) {
            }
        }

        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            try {
                Claims claims = jwtService.parse(request.refreshToken());
                Instant expiry = claims.getExpiration() != null ? claims.getExpiration().toInstant() : now.plus(Duration.ofDays(7));
                String hash = JwtService.sha256Hex(request.refreshToken());
                if (!revokedTokens.existsByTokenHash(hash)) {
                    revokedTokens.save(new RevokedTokenEntity(
                            UUID.randomUUID().toString(),
                            hash,
                            JwtService.TYPE_REFRESH,
                            principal != null ? principal.getUserId() : claims.getSubject(),
                            expiry,
                            now
                    ));
                }
            } catch (Exception ignored) {
            }
        }

        return new AuthDtos.SimpleMessageResponse("Đăng xuất thành công");
    }

    private AuthDtos.AuthResponse issueTokens(AppUserDetails principal, String fullName) {
        return new AuthDtos.AuthResponse(
                "Bearer",
                jwtService.generateAccessToken(principal.getUserId(), principal.getEmail(), principal.getRoleNames()),
                jwtService.generateRefreshToken(principal.getUserId()),
                jwtService.accessTtlSeconds(),
                principal.getUserId(),
                principal.getEmail(),
                fullName,
                principal.getRoleNames());
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
