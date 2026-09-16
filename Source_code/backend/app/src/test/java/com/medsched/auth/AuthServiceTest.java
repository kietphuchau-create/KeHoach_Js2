package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.persistence.entity.PatientProfileEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.entity.UserMedicalCenterRoleEntity;
import com.medsched.persistence.enums.RelationshipType;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.security.AppUserDetails;
import com.medsched.security.AppUserDetailsService;
import com.medsched.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Business rules of register / login / token refresh. */
class AuthServiceTest {

    private static final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    private UserJpaRepository users;
    private PatientProfileJpaRepository patientProfiles;
    private AuthenticationManager authenticationManager;
    private AppUserDetailsService userDetailsService;
    private JwtService jwtService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        users = mock(UserJpaRepository.class);
        patientProfiles = mock(PatientProfileJpaRepository.class);
        authenticationManager = mock(AuthenticationManager.class);
        userDetailsService = mock(AppUserDetailsService.class);
        jwtService = new JwtService(SECRET, Duration.ofHours(1), Duration.ofDays(7));
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        authService = new AuthService(users, patientProfiles, passwordEncoder,
                authenticationManager, userDetailsService, jwtService);
    }

    private UserEntity user(String id, String email, String fullName) {
        Instant now = Instant.now();
        return new UserEntity(id, email, "$2a$10$hash", fullName, "0912345678", true, now, now);
    }

    private AppUserDetails patient(UserEntity user) {
        return new AppUserDetails(user, List.<UserMedicalCenterRoleEntity>of());
    }

    @Test
    @DisplayName("Register also creates the SELF patient profile")
    void registerCreatesSelfPatientProfile() {
        when(users.existsByEmail("moi@gmail.com")).thenReturn(false);
        when(users.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userDetailsService.loadUserById(anyString()))
                .thenAnswer(inv -> patient(user(inv.getArgument(0), "moi@gmail.com", "Nguyen Van A")));

        AuthDtos.AuthResponse res = authService.register(new AuthDtos.RegisterRequest(
                "  MOI@Gmail.com  ", "Matkhau@123", "  Nguyen Van A  ", "0912345678"));

        ArgumentCaptor<PatientProfileEntity> profile = ArgumentCaptor.forClass(PatientProfileEntity.class);
        verify(patientProfiles).save(profile.capture());
        assertThat(profile.getValue().getRelationship()).isEqualTo(RelationshipType.SELF);
        assertThat(profile.getValue().getFullName()).isEqualTo("Nguyen Van A");
        assertThat(res.tokenType()).isEqualTo("Bearer");
        assertThat(res.expiresIn()).isEqualTo(3600L);
        // A brand new account is a patient only: no staff role is granted.
        assertThat(res.roles()).containsExactly(AppUserDetails.ROLE_PATIENT);
    }

    @Test
    @DisplayName("Register normalises the email to lowercase and stores a blank phone as NULL")
    void registerNormalisesEmail() {
        when(users.existsByEmail("moi@gmail.com")).thenReturn(false);
        when(users.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userDetailsService.loadUserById(anyString()))
                .thenAnswer(inv -> patient(user(inv.getArgument(0), "moi@gmail.com", "A")));

        authService.register(new AuthDtos.RegisterRequest("  MOI@Gmail.com ", "Matkhau@123", "A", ""));

        ArgumentCaptor<UserEntity> saved = ArgumentCaptor.forClass(UserEntity.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("moi@gmail.com");
        assertThat(saved.getValue().getPhone()).isNull();
    }

    @Test
    @DisplayName("Register hashes the password and never stores it in clear text")
    void registerHashesPassword() {
        when(users.existsByEmail(anyString())).thenReturn(false);
        when(users.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userDetailsService.loadUserById(anyString()))
                .thenAnswer(inv -> patient(user(inv.getArgument(0), "a@b.com", "A")));

        authService.register(new AuthDtos.RegisterRequest("a@b.com", "Matkhau@123", "A", null));

        ArgumentCaptor<UserEntity> saved = ArgumentCaptor.forClass(UserEntity.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash())
                .isNotEqualTo("Matkhau@123")
                .startsWith("$2a$");
    }

    @Test
    @DisplayName("Register rejects a duplicate email and writes nothing to the database")
    void registerRejectsDuplicateEmail() {
        when(users.existsByEmail("trung@gmail.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new AuthDtos.RegisterRequest("trung@gmail.com", "Matkhau@123", "A", null)))
                .isInstanceOf(AppExceptions.ConflictException.class);

        verify(users, never()).save(any());
        verify(patientProfiles, never()).save(any());
    }

    @Test
    @DisplayName("Login lets the authentication error bubble up for the error handler to translate")
    void loginPropagatesBadCredentials() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(new AuthDtos.LoginRequest("a@b.com", "wrong")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("Refresh rejects an access token sent in place of a refresh token")
    void refreshRejectsAccessToken() {
        String accessToken = jwtService.generateAccessToken("user-1", "a@b.com", List.of());

        assertThatThrownBy(() -> authService.refresh(new AuthDtos.RefreshRequest(accessToken)))
                .isInstanceOf(AppExceptions.BadRequestException.class)
                .hasMessageContaining("không phải refresh token");
    }

    @Test
    @DisplayName("Refresh rejects a malformed or expired token")
    void refreshRejectsBrokenToken() {
        assertThatThrownBy(() -> authService.refresh(new AuthDtos.RefreshRequest("made-up-token")))
                .isInstanceOf(AppExceptions.BadRequestException.class)
                .hasMessageContaining("không hợp lệ");
    }

    @Test
    @DisplayName("A valid refresh token is exchanged for a new token pair")
    void refreshReturnsNewTokenPair() {
        UserEntity u = user("user-1", "a@b.com", "Nguyen Van A");
        when(userDetailsService.loadUserById("user-1")).thenReturn(patient(u));
        when(users.findById("user-1")).thenReturn(Optional.of(u));

        AuthDtos.AuthResponse res = authService.refresh(
                new AuthDtos.RefreshRequest(jwtService.generateRefreshToken("user-1")));

        assertThat(res.userId()).isEqualTo("user-1");
        assertThat(res.fullName()).isEqualTo("Nguyen Van A");
        assertThat(jwtService.isType(jwtService.parse(res.accessToken()), JwtService.TYPE_ACCESS)).isTrue();
    }
}
