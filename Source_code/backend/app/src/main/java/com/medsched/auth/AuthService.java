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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
