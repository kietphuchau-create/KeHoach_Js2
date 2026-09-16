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
        String phone = blankToNull(request.phone());

        UserEntity user = new UserEntity(UUID.randomUUID().toString(), email,
                passwordEncoder.encode(request.password()), fullName, phone, true, now, now);
        users.save(user);

        PatientProfileEntity self = new PatientProfileEntity(UUID.randomUUID().toString(), user.getId(),
                RelationshipType.SELF, fullName, null, null, null, null, phone, null, null, now, now);
        patientProfiles.save(self);

        return issueTokens(userDetailsService.loadUserById(user.getId()), user.getFullName());
    }

    /** One login flow shared by Customer / Doctor / Staff / Admin. */
    @Transactional(readOnly = true)
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        // Wrong email/password -> BadCredentialsException; locked account ->
        // DisabledException. GlobalExceptionHandler turns both into the proper
        // user-facing message.
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizeEmail(request.email()), request.password()));
        AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
        UserEntity user = users.findById(principal.getUserId())
                .orElseThrow(() -> new AppExceptions.NotFoundException("Không tìm thấy tài khoản"));
        return issueTokens(principal, user.getFullName());
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
