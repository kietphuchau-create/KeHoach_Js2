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

/** Kiểm thử quy tắc nghiệp vụ của đăng ký / đăng nhập / làm mới token. */
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

    private AppUserDetails benhNhan(UserEntity user) {
        return new AppUserDetails(user, List.<UserMedicalCenterRoleEntity>of());
    }

    @Test
    @DisplayName("Đăng ký: tạo tài khoản và tự tạo luôn hồ sơ người khám SELF")
    void dangKyTaoKemHoSoSelf() {
        when(users.existsByEmail("moi@gmail.com")).thenReturn(false);
        when(users.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userDetailsService.loadUserById(anyString()))
                .thenAnswer(inv -> benhNhan(user(inv.getArgument(0), "moi@gmail.com", "Nguyen Van A")));

        AuthDtos.AuthResponse res = authService.register(new AuthDtos.RegisterRequest(
                "  MOI@Gmail.com  ", "Matkhau@123", "  Nguyen Van A  ", "0912345678"));

        ArgumentCaptor<PatientProfileEntity> hoSo = ArgumentCaptor.forClass(PatientProfileEntity.class);
        verify(patientProfiles).save(hoSo.capture());
        assertThat(hoSo.getValue().getRelationship()).isEqualTo(RelationshipType.SELF);
        assertThat(hoSo.getValue().getFullName()).isEqualTo("Nguyen Van A");
        assertThat(res.tokenType()).isEqualTo("Bearer");
        assertThat(res.expiresIn()).isEqualTo(3600L);
        assertThat(res.roles()).containsExactly(AppUserDetails.ROLE_PATIENT);
    }

    @Test
    @DisplayName("Đăng ký: email chuẩn hóa về chữ thường, số điện thoại rỗng lưu thành NULL")
    void dangKyChuanHoaEmail() {
        when(users.existsByEmail("moi@gmail.com")).thenReturn(false);
        when(users.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userDetailsService.loadUserById(anyString()))
                .thenAnswer(inv -> benhNhan(user(inv.getArgument(0), "moi@gmail.com", "A")));

        authService.register(new AuthDtos.RegisterRequest("  MOI@Gmail.com ", "Matkhau@123", "A", ""));

        ArgumentCaptor<UserEntity> daLuu = ArgumentCaptor.forClass(UserEntity.class);
        verify(users).save(daLuu.capture());
        assertThat(daLuu.getValue().getEmail()).isEqualTo("moi@gmail.com");
        assertThat(daLuu.getValue().getPhone()).isNull();
    }

    @Test
    @DisplayName("Đăng ký: mật khẩu phải được băm, không bao giờ lưu dạng thô")
    void dangKyBamMatKhau() {
        when(users.existsByEmail(anyString())).thenReturn(false);
        when(users.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userDetailsService.loadUserById(anyString()))
                .thenAnswer(inv -> benhNhan(user(inv.getArgument(0), "a@b.com", "A")));

        authService.register(new AuthDtos.RegisterRequest("a@b.com", "Matkhau@123", "A", null));

        ArgumentCaptor<UserEntity> daLuu = ArgumentCaptor.forClass(UserEntity.class);
        verify(users).save(daLuu.capture());
        assertThat(daLuu.getValue().getPasswordHash())
                .isNotEqualTo("Matkhau@123")
                .startsWith("$2a$");
    }

    @Test
    @DisplayName("Đăng ký: trùng email bị từ chối và không ghi gì vào CSDL")
    void dangKyTrungEmailBiTuChoi() {
        when(users.existsByEmail("trung@gmail.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new AuthDtos.RegisterRequest("trung@gmail.com", "Matkhau@123", "A", null)))
                .isInstanceOf(AppExceptions.ConflictException.class);

        verify(users, never()).save(any());
        verify(patientProfiles, never()).save(any());
    }

    @Test
    @DisplayName("Đăng nhập: sai thông tin thì lỗi được ném nguyên vẹn cho tầng trên xử lý")
    void dangNhapSaiThongTin() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(new AuthDtos.LoginRequest("a@b.com", "sai")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("Làm mới token: từ chối khi đưa nhầm access token")
    void refreshTuChoiAccessToken() {
        String accessToken = jwtService.generateAccessToken("user-1", "a@b.com", List.of());

        assertThatThrownBy(() -> authService.refresh(new AuthDtos.RefreshRequest(accessToken)))
                .isInstanceOf(AppExceptions.BadRequestException.class)
                .hasMessageContaining("không phải refresh token");
    }

    @Test
    @DisplayName("Làm mới token: từ chối token rác hoặc đã hết hạn")
    void refreshTuChoiTokenHong() {
        assertThatThrownBy(() -> authService.refresh(new AuthDtos.RefreshRequest("token-bia-dat")))
                .isInstanceOf(AppExceptions.BadRequestException.class)
                .hasMessageContaining("không hợp lệ");
    }

    @Test
    @DisplayName("Làm mới token: refresh token hợp lệ đổi được cặp token mới")
    void refreshThanhCong() {
        UserEntity u = user("user-1", "a@b.com", "Nguyen Van A");
        when(userDetailsService.loadUserById("user-1")).thenReturn(benhNhan(u));
        when(users.findById("user-1")).thenReturn(Optional.of(u));

        AuthDtos.AuthResponse res = authService.refresh(
                new AuthDtos.RefreshRequest(jwtService.generateRefreshToken("user-1")));

        assertThat(res.userId()).isEqualTo("user-1");
        assertThat(res.fullName()).isEqualTo("Nguyen Van A");
        assertThat(jwtService.isType(jwtService.parse(res.accessToken()), JwtService.TYPE_ACCESS)).isTrue();
    }
}
