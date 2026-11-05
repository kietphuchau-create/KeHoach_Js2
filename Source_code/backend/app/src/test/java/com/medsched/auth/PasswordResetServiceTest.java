package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.mail.EmailService;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.repository.UserJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Kiểm thử TDD cho Dịch vụ Khôi phục Mật khẩu (REQ-AUTH-05)")
class PasswordResetServiceTest {

    private UserJpaRepository users;
    private PasswordEncoder passwordEncoder;
    private EmailService emailService;
    private PasswordResetService passwordResetService;

    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        users = mock(UserJpaRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        emailService = mock(EmailService.class);

        passwordResetService = new PasswordResetService(users, passwordEncoder, emailService);

        testUser = new UserEntity(
                "user-123",
                "patient@medsched.vn",
                passwordEncoder.encode("OldPassword123@"),
                "Nguyễn Văn Bệnh Nhân",
                "0987654321",
                true,
                Instant.now(),
                Instant.now()
        );
        testUser.setCurrentSessionId("old-session-uuid");
    }

    @Test
    @DisplayName("BƯỚC 1: Quên mật khẩu thành công - Sinh mã OTP 6 số và gửi email")
    void forgotPassword_Success() {
        when(users.findByEmail("patient@medsched.vn")).thenReturn(Optional.of(testUser));

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

        // Cả Token và OTP đều có thể dùng để tra cứu session
        assertThat(passwordResetService.hasActiveSession(capturedToken)).isTrue();
        assertThat(passwordResetService.hasActiveSession(capturedOtp)).isTrue();
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
        when(users.findByEmail("patient@medsched.vn")).thenReturn(Optional.of(testUser));
        when(users.findById("user-123")).thenReturn(Optional.of(testUser));

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

        // Kiểm tra mật khẩu mới đã được băm BCrypt chính xác
        assertThat(passwordEncoder.matches("NewPassword456@", testUser.getPasswordHash())).isTrue();

        // Kiểm tra session cũ bị hủy (đổi sessionId để kickout đăng nhập cũ)
        assertThat(testUser.getCurrentSessionId()).isNotEqualTo("old-session-uuid");
        verify(users, times(1)).save(testUser);

        // Token và OTP không thể tái sử dụng lần 2
        assertThat(passwordResetService.hasActiveSession(token)).isFalse();
    }

    @Test
    @DisplayName("BƯỚC 2: Đặt lại mật khẩu thành công khi nhập trực tiếp mã OTP 6 số")
    void resetPassword_Success_UsingOtpCode() {
        when(users.findByEmail("patient@medsched.vn")).thenReturn(Optional.of(testUser));
        when(users.findById("user-123")).thenReturn(Optional.of(testUser));

        // 1. Tạo session
        var forgotReq = new PasswordResetDtos.ForgotPasswordRequest("patient@medsched.vn");
        passwordResetService.processForgotPassword(forgotReq);

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(anyString(), anyString(), anyString(), otpCaptor.capture());
        String otpCode = otpCaptor.getValue();

        // 2. Đặt lại mật khẩu với mã OTP 6 số
        var resetReq = new PasswordResetDtos.ResetPasswordRequest(otpCode, "BrandNewPassword789@");
        var resetRes = passwordResetService.processResetPassword(resetReq);

        assertThat(resetRes.message()).contains("Đặt lại mật khẩu thành công");
        assertThat(passwordEncoder.matches("BrandNewPassword789@", testUser.getPasswordHash())).isTrue();
        verify(users, times(1)).save(testUser);
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

