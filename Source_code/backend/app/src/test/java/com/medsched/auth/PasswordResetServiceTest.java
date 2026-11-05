package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.mail.EmailService;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.entity.UserMedicalCenterRoleEntity;
import com.medsched.persistence.enums.UserRole;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.persistence.repository.UserMedicalCenterRoleJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Kiểm thử TDD cho Dịch vụ Khôi phục Mật khẩu (REQ-AUTH-05 - Chỉ áp dụng cho Bệnh nhân)")
class PasswordResetServiceTest {

    private UserJpaRepository users;
    private UserMedicalCenterRoleJpaRepository centerRoles;
    private PasswordEncoder passwordEncoder;
    private EmailService emailService;
    private PasswordResetService passwordResetService;

    private UserEntity testPatient;
    private UserEntity testDoctor;

    @BeforeEach
    void setUp() {
        users = mock(UserJpaRepository.class);
        centerRoles = mock(UserMedicalCenterRoleJpaRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        emailService = mock(EmailService.class);

        passwordResetService = new PasswordResetService(users, centerRoles, passwordEncoder, emailService);

        testPatient = new UserEntity(
                "patient-123",
                "patient@medsched.vn",
                passwordEncoder.encode("OldPassword123@"),
                "Nguyễn Văn Bệnh Nhân",
                "0987654321",
                true,
                Instant.now(),
                Instant.now()
        );
        testPatient.setCurrentSessionId("old-session-uuid");

        testDoctor = new UserEntity(
                "doctor-456",
                "doctor@medsched.vn",
                passwordEncoder.encode("DoctorPass123@"),
                "BS. Trần Văn Bác Sĩ",
                "0912345678",
                true,
                Instant.now(),
                Instant.now()
        );
    }

    @Test
    @DisplayName("BƯỚC 1: Bệnh nhân quên mật khẩu thành công - Sinh mã OTP 6 số và gửi email")
    void forgotPassword_Success_ForPatient() {
        when(users.findByEmail("patient@medsched.vn")).thenReturn(Optional.of(testPatient));
        when(centerRoles.findByUserIdAndActiveTrue("patient-123")).thenReturn(List.of()); // Không mang role nhân viên

        var request = new PasswordResetDtos.ForgotPasswordRequest("patient@medsched.vn");
        var response = passwordResetService.processForgotPassword(request);

        assertThat(response.email()).isEqualTo("patient@medsched.vn");
        assertThat(response.expiresInMinutes()).isEqualTo(15);
        assertThat(response.message()).contains("Mã xác thực và liên kết");

        // Xác nhận hàm gửi email được kích hoạt kèm OTP 6 số và Token
        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService, times(1)).sendPasswordResetEmail(
                eq("patient@medsched.vn"),
                eq("Nguyễn Văn Bệnh Nhân"),
                tokenCaptor.capture(),
                otpCaptor.capture()
        );

        String capturedToken = tokenCaptor.getValue();
        String capturedOtp = otpCaptor.getValue();
        assertThat(capturedToken).isNotBlank();
        assertThat(capturedOtp).hasSize(6).containsOnlyDigits();

        assertThat(passwordResetService.hasActiveSession(capturedToken)).isTrue();
        assertThat(passwordResetService.hasActiveSession(capturedOtp)).isTrue();
    }

    @Test
    @DisplayName("BƯỚC 1: Từ chối tự khôi phục mật khẩu khi người dùng là Bác sĩ (ROLE_DOCTOR)")
    void forgotPassword_Rejected_ForDoctor() {
        when(users.findByEmail("doctor@medsched.vn")).thenReturn(Optional.of(testDoctor));
        var doctorRole = new UserMedicalCenterRoleEntity("r1", "doctor-456", "mc-1", UserRole.ROLE_DOCTOR, Instant.now(), Instant.now());
        when(centerRoles.findByUserIdAndActiveTrue("doctor-456")).thenReturn(List.of(doctorRole));

        var request = new PasswordResetDtos.ForgotPasswordRequest("doctor@medsched.vn");

        assertThatThrownBy(() -> passwordResetService.processForgotPassword(request))
                .isInstanceOf(AppExceptions.BadRequestException.class)
                .hasMessageContaining("chỉ áp dụng cho Bệnh nhân")
                .hasMessageContaining("liên hệ Quản trị viên (Admin)");

        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("BƯỚC 1: Từ chối tự khôi phục mật khẩu khi người dùng là Nhân viên quầy / Lễ tân (ROLE_STAFF)")
    void forgotPassword_Rejected_ForStaff() {
        when(users.findByEmail("staff@medsched.vn")).thenReturn(Optional.of(testDoctor));
        var staffRole = new UserMedicalCenterRoleEntity("r2", "doctor-456", "mc-1", UserRole.ROLE_STAFF, Instant.now(), Instant.now());
        when(centerRoles.findByUserIdAndActiveTrue("doctor-456")).thenReturn(List.of(staffRole));

        var request = new PasswordResetDtos.ForgotPasswordRequest("staff@medsched.vn");

        assertThatThrownBy(() -> passwordResetService.processForgotPassword(request))
                .isInstanceOf(AppExceptions.BadRequestException.class)
                .hasMessageContaining("chỉ áp dụng cho Bệnh nhân");

        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("BƯỚC 1: Quên mật khẩu thất bại khi email không tồn tại trong hệ thống (404)")
    void forgotPassword_NotFound() {
        when(users.findByEmail("unknown@medsched.vn")).thenReturn(Optional.empty());

        var request = new PasswordResetDtos.ForgotPasswordRequest("unknown@medsched.vn");

        assertThatThrownBy(() -> passwordResetService.processForgotPassword(request))
                .isInstanceOf(AppExceptions.NotFoundException.class)
                .hasMessageContaining("Không tìm thấy tài khoản");

        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("BƯỚC 2: Đặt lại mật khẩu thành công khi dùng Token từ URL")
    void resetPassword_Success_UsingToken() {
        when(users.findByEmail("patient@medsched.vn")).thenReturn(Optional.of(testPatient));
        when(users.findById("patient-123")).thenReturn(Optional.of(testPatient));
        when(centerRoles.findByUserIdAndActiveTrue("patient-123")).thenReturn(List.of());

        // 1. Tạo session
        var forgotReq = new PasswordResetDtos.ForgotPasswordRequest("patient@medsched.vn");
        passwordResetService.processForgotPassword(forgotReq);

        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(anyString(), anyString(), tokenCaptor.capture(), anyString());
        String token = tokenCaptor.getValue();

        // 2. Đặt lại mật khẩu với token
        var resetReq = new PasswordResetDtos.ResetPasswordRequest(token, "NewPassword456@");
        var resetRes = passwordResetService.processResetPassword(resetReq);

        assertThat(resetRes.message()).contains("Đặt lại mật khẩu thành công");
        assertThat(passwordEncoder.matches("NewPassword456@", testPatient.getPasswordHash())).isTrue();
        assertThat(testPatient.getCurrentSessionId()).isNotEqualTo("old-session-uuid");
        verify(users, times(1)).save(testPatient);
        assertThat(passwordResetService.hasActiveSession(token)).isFalse();
    }

    @Test
    @DisplayName("BƯỚC 2: Đặt lại mật khẩu thành công khi nhập trực tiếp mã OTP 6 số")
    void resetPassword_Success_UsingOtpCode() {
        when(users.findByEmail("patient@medsched.vn")).thenReturn(Optional.of(testPatient));
        when(users.findById("patient-123")).thenReturn(Optional.of(testPatient));
        when(centerRoles.findByUserIdAndActiveTrue("patient-123")).thenReturn(List.of());

        var forgotReq = new PasswordResetDtos.ForgotPasswordRequest("patient@medsched.vn");
        passwordResetService.processForgotPassword(forgotReq);

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(anyString(), anyString(), anyString(), otpCaptor.capture());
        String otpCode = otpCaptor.getValue();

        var resetReq = new PasswordResetDtos.ResetPasswordRequest(otpCode, "BrandNewPassword789@");
        var resetRes = passwordResetService.processResetPassword(resetReq);

        assertThat(resetRes.message()).contains("Đặt lại mật khẩu thành công");
        assertThat(passwordEncoder.matches("BrandNewPassword789@", testPatient.getPasswordHash())).isTrue();
        verify(users, times(1)).save(testPatient);
    }

    @Test
    @DisplayName("BƯỚC 2: Đặt lại mật khẩu thất bại khi mã OTP/Token không hợp lệ (400)")
    void resetPassword_InvalidToken() {
        var resetReq = new PasswordResetDtos.ResetPasswordRequest("invalid-token-or-otp", "NewPassword123@");

        assertThatThrownBy(() -> passwordResetService.processResetPassword(resetReq))
                .isInstanceOf(AppExceptions.BadRequestException.class)
                .hasMessageContaining("không hợp lệ hoặc đã hết hạn");

        verify(users, never()).save(any());
    }
}
