package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.common.InputValidator;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.security.authentication.BadCredentialsException;

@Service
public class AuthService {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    private final ConcurrentMap<String, Integer> failedAttempts = new ConcurrentHashMap<>();

    public void clearFailedAttempts(String identifier) {
        if (identifier != null) {
            failedAttempts.remove(identifier.trim().toLowerCase());
        }
    }

    public int getFailedAttempts(String identifier) {
        return identifier != null ? failedAttempts.getOrDefault(identifier.trim().toLowerCase(), 0) : 0;
    }

    private final UserJpaRepository users;
    private final PatientProfileJpaRepository patientProfiles;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AppUserDetailsService userDetailsService;
    private final JwtService jwtService;

    public AuthService(UserJpaRepository users,
                       PatientProfileJpaRepository patientProfiles,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       AppUserDetailsService userDetailsService,
                       JwtService jwtService) {
        this.users = users;
        this.patientProfiles = patientProfiles;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
    }

    /**
     * Registers a patient account. A new account gets NO row in
     * {@code user_medical_center_roles} - per the v3.0 design every account can
     * already book at any branch without being granted a staff role.
     * <p>
     * It also creates the {@code SELF} patient profile up front so the patient
     * can book immediately without a second setup step.
     */
    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new AppExceptions.ConflictException("Email này đã được đăng ký");
        }

        Instant now = Instant.now();
        String fullName = request.fullName().trim();
        String rawPhone = blankToNull(request.phone());
        String phone = null;
        if (rawPhone != null) {
            phone = InputValidator.validatePhone(rawPhone);
            if (users.existsByPhone(phone)) {
                throw new AppExceptions.ConflictException("Số điện thoại này đã được đăng ký cho một tài khoản khác");
            }
        }
        validatePasswordSecurity(request.password(), fullName, phone, email);

        UserEntity user = new UserEntity(UUID.randomUUID().toString(), email,
                passwordEncoder.encode(request.password()), fullName, phone, true, now, now);
        String sessionId = UUID.randomUUID().toString();
        user.setCurrentSessionId(sessionId);
        users.save(user);

        PatientProfileEntity self = new PatientProfileEntity(UUID.randomUUID().toString(), user.getId(),
                RelationshipType.SELF, fullName, blankToNull(request.cccdNumber()), null,
                request.dateOfBirth(), request.gender(), phone, null, null, now, now);
        patientProfiles.save(self);

        return issueTokens(userDetailsService.loadUserById(user.getId()), user.getFullName(), sessionId);
    }

    /** One login flow shared by Customer / Doctor / Staff / Admin. */
    @Transactional
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        String rawIdentifier = request.email() != null ? request.email().trim() : "";
        String normalizedIdentifier = rawIdentifier;
        if (!rawIdentifier.contains("@")) {
            normalizedIdentifier = rawIdentifier.replaceAll("[\\s.-]", "");
            if (normalizedIdentifier.startsWith("+84")) {
                normalizedIdentifier = "0" + normalizedIdentifier.substring(3);
            } else if (normalizedIdentifier.startsWith("84") && normalizedIdentifier.length() == 11) {
                normalizedIdentifier = "0" + normalizedIdentifier.substring(2);
            }
        } else {
            normalizedIdentifier = normalizeEmail(rawIdentifier);
        }

        final String finalIdentifier = normalizedIdentifier;
        String lookupKey = finalIdentifier.toLowerCase();

        // 1. REQ-AUTH-02: Kiểm tra nếu tài khoản đã bị khóa trước đó
        var existingUserOpt = users.findByEmail(finalIdentifier)
                .or(() -> users.findByPhone(finalIdentifier));

        if (existingUserOpt.isPresent() && !existingUserOpt.get().isActive()) {
            throw new AppExceptions.AccountLockedException(
                    "Tài khoản của bạn đã bị khóa do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng liên hệ Quản trị viên (Admin) hoặc dùng chức năng Quên mật khẩu để khôi phục.");
        }

        if (failedAttempts.getOrDefault(lookupKey, 0) >= MAX_FAILED_ATTEMPTS) {
            existingUserOpt.ifPresent(u -> {
                u.setActive(false);
                users.save(u);
            });
            throw new AppExceptions.AccountLockedException(
                    "Tài khoản của bạn đã bị tạm khóa do nhập sai mật khẩu 5 lần liên tiếp (HTTP 423 Locked). Vui lòng sử dụng chức năng Quên mật khẩu để đặt lại.");
        }

        // 2. Xác thực thông tin đăng nhập
        org.springframework.security.core.Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedIdentifier, request.password()));
        } catch (BadCredentialsException ex) {
            int currentFailures = failedAttempts.merge(lookupKey, 1, Integer::sum);
            if (currentFailures >= MAX_FAILED_ATTEMPTS) {
                existingUserOpt.ifPresent(u -> {
                    u.setActive(false);
                    users.save(u);
                });
                throw new AppExceptions.AccountLockedException(
                        "Tài khoản của bạn đã bị tạm khóa do nhập sai mật khẩu 5 lần liên tiếp (HTTP 423 Locked). Vui lòng liên hệ Quản trị viên hoặc sử dụng Quên mật khẩu để khôi phục.");
            }
            int remaining = MAX_FAILED_ATTEMPTS - currentFailures;
            throw new BadCredentialsException(
                    "Email hoặc mật khẩu không đúng. Bạn còn " + remaining + " lần thử trước khi tài khoản bị khóa.");
        }

        // 3. Đăng nhập thành công -> Xóa bộ đếm sai
        failedAttempts.remove(lookupKey);

        AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
        UserEntity user = users.findById(principal.getUserId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));

        // Single active web session (Concurrent session kickout):
        // Sinh session ID mới, ghi đè session cũ để vô hiệu hóa trình duyệt trước đó
        String sessionId = UUID.randomUUID().toString();
        user.setCurrentSessionId(sessionId);
        users.save(user);

        return issueTokens(principal, user.getFullName(), sessionId);
    }

    /**
     * Exchanges a still-valid refresh token for a fresh token pair (rotation).
     * Authorities are reloaded from the database, so a role an admin has just
     * revoked will not appear in the new access token.
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

        String tokenSid = claims.get(JwtService.CLAIM_SESSION_ID, String.class);
        if (user.getCurrentSessionId() != null && tokenSid != null && !user.getCurrentSessionId().equals(tokenSid)) {
            throw new AppExceptions.BadRequestException("Phiên làm việc đã hết hạn do tài khoản được đăng nhập trên trình duyệt khác");
        }

        String effectiveSessionId = user.getCurrentSessionId() != null ? user.getCurrentSessionId() : tokenSid;
        return issueTokens(principal, user.getFullName(), effectiveSessionId);
    }

    private AuthDtos.AuthResponse issueTokens(AppUserDetails principal, String fullName, String sessionId) {
        return new AuthDtos.AuthResponse(
                "Bearer",
                jwtService.generateAccessToken(principal.getUserId(), principal.getEmail(), principal.getRoleNames(), sessionId),
                jwtService.generateRefreshToken(principal.getUserId(), sessionId),
                jwtService.accessTtlSeconds(),
                principal.getUserId(),
                principal.getEmail(),
                fullName,
                principal.getRoleNames());
    }

    private static void validatePasswordSecurity(String password, String fullName, String phone, String email) {
        if (password == null) {
            return;
        }
        String lowerPwd = removeAccents(password.toLowerCase());

        if (fullName != null) {
            String normName = removeAccents(fullName.toLowerCase()).trim();
            String noSpaces = normName.replaceAll("\\s+", "");
            if (noSpaces.length() >= 3 && lowerPwd.contains(noSpaces)) {
                throw new AppExceptions.BadRequestException("Mật khẩu không được chứa họ tên của bạn");
            }
            for (String word : normName.split("\\s+")) {
                if (word.length() >= 3 && lowerPwd.contains(word)) {
                    throw new AppExceptions.BadRequestException("Mật khẩu không được chứa từ trong họ tên");
                }
            }
        }

        if (phone != null && !phone.isBlank()) {
            String cleanPhone = phone.replaceAll("\\D", "");
            if (cleanPhone.length() >= 6 && (lowerPwd.contains(cleanPhone)
                    || (cleanPhone.length() == 10 && (lowerPwd.contains(cleanPhone.substring(4)) || lowerPwd.contains(cleanPhone.substring(0, 6)))))) {
                throw new AppExceptions.BadRequestException("Mật khẩu không được chứa số điện thoại của bạn");
            }
        }

        if (email != null && email.contains("@")) {
            String prefix = email.split("@")[0].toLowerCase().trim();
            if (prefix.length() >= 3 && lowerPwd.contains(prefix)) {
                throw new AppExceptions.BadRequestException("Mật khẩu không được chứa tên tài khoản email");
            }
        }
    }

    private static String removeAccents(String text) {
        if (text == null) {
            return "";
        }
        String nfd = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        return java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+").matcher(nfd)
                .replaceAll("").replace("đ", "d").replace("Đ", "D");
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
