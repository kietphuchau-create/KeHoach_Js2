package com.medsched.auth;

import com.medsched.common.AppExceptions;
import com.medsched.common.EmailService;
import com.medsched.persistence.entity.PasswordResetTokenEntity;
import com.medsched.persistence.entity.RevokedTokenEntity;
import com.medsched.persistence.entity.UserEntity;
import com.medsched.persistence.repository.PasswordResetTokenJpaRepository;
import com.medsched.persistence.repository.PatientProfileJpaRepository;
import com.medsched.persistence.repository.RevokedTokenJpaRepository;
import com.medsched.persistence.repository.UserJpaRepository;
import com.medsched.security.AppUserDetails;
import com.medsched.security.AppUserDetailsService;
import com.medsched.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserJpaRepository users;
    @Mock
    private PatientProfileJpaRepository patientProfiles;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private AppUserDetailsService userDetailsService;
    @Mock
    private JwtService jwtService;
    @Mock
    private PasswordResetTokenJpaRepository passwordResetTokens;
    @Mock
    private RevokedTokenJpaRepository revokedTokens;
    @Mock
    private EmailService emailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                users,
                patientProfiles,
                passwordEncoder,
                authenticationManager,
                userDetailsService,
                jwtService,
                passwordResetTokens,
                revokedTokens,
                emailService
        );
    }

    @Nested
    @DisplayName("1. Forgot Password Tests")
    class ForgotPasswordTests {

        @Test
        @DisplayName("Email hợp lệ và tồn tại -> Tạo reset token và gọi EmailService, trả về thông điệp thành công")
        void givenRegisteredEmail_whenForgotPassword_thenTokenCreatedAndEmailed() {
            UserEntity user = new UserEntity(
                    "user-1", "user@example.com", "hash", "Nguyễn Văn A", "0901234567",
                    true, Instant.now(), Instant.now()
            );
            given(users.findByEmail("user@example.com")).willReturn(Optional.of(user));

            AuthDtos.SimpleMessageResponse response = authService.forgotPassword(
                    new AuthDtos.ForgotPasswordRequest("user@example.com")
            );

            assertThat(response.message()).contains("hướng dẫn đặt lại mật khẩu đã được gửi");
            verify(passwordResetTokens).save(any(PasswordResetTokenEntity.class));
            verify(emailService).sendPasswordResetEmail(eq("user@example.com"), anyString());
        }

        @Test
        @DisplayName("Email không tồn tại -> Trả về thông điệp giống hệt (chống dò email), không lưu token và không gửi mail")
        void givenUnknownEmail_whenForgotPassword_thenIdenticalResponsePreventingEnumeration() {
            given(users.findByEmail("unknown@example.com")).willReturn(Optional.empty());

            AuthDtos.SimpleMessageResponse response = authService.forgotPassword(
                    new AuthDtos.ForgotPasswordRequest("unknown@example.com")
            );

            assertThat(response.message()).contains("hướng dẫn đặt lại mật khẩu đã được gửi");
            verify(passwordResetTokens, never()).save(any());
            verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("2. Reset Password Tests")
    class ResetPasswordTests {

        @Test
        @DisplayName("Token hợp lệ và chưa hết hạn -> Cập nhật mật khẩu mới và huỷ toàn bộ session cũ")
        void givenValidToken_whenResetPassword_thenPasswordUpdatedAndSessionsInvalidated() {
            String rawToken = "valid-token-123";
            String tokenHash = JwtService.sha256Hex(rawToken);

            Instant now = Instant.now();
            PasswordResetTokenEntity tokenEntity = new PasswordResetTokenEntity(
                    "token-id-1", "user-1", tokenHash, now.plus(Duration.ofMinutes(15)), null, now
            );
            UserEntity user = new UserEntity(
                    "user-1", "user@example.com", "old-hash", "Nguyễn Văn A", "0901234567",
                    true, now, now
            );

            given(passwordResetTokens.findByTokenHash(tokenHash)).willReturn(Optional.of(tokenEntity));
            given(users.findById("user-1")).willReturn(Optional.of(user));
            given(passwordEncoder.encode("NewSecret@123")).willReturn("new-hash");

            AuthDtos.SimpleMessageResponse response = authService.resetPassword(
                    new AuthDtos.ResetPasswordRequest(rawToken, "NewSecret@123")
            );

            assertThat(response.message()).contains("Đặt lại mật khẩu thành công");
            assertThat(user.getPasswordHash()).isEqualTo("new-hash");
            assertThat(user.getTokenInvalidBefore()).isNotNull(); // Vô hiệu hoá session cũ
            assertThat(tokenEntity.isUsed()).isTrue(); // Đánh dấu đã dùng
            verify(users).save(user);
            verify(passwordResetTokens).save(tokenEntity);
        }

        @Test
        @DisplayName("Token hết hạn -> Từ chối và ném BadRequestException")
        void givenExpiredToken_whenResetPassword_thenThrowsBadRequestException() {
            String rawToken = "expired-token-123";
            String tokenHash = JwtService.sha256Hex(rawToken);

            Instant past = Instant.now().minus(Duration.ofMinutes(30));
            PasswordResetTokenEntity tokenEntity = new PasswordResetTokenEntity(
                    "token-id-1", "user-1", tokenHash, past, null, past.minus(Duration.ofMinutes(15))
            );

            given(passwordResetTokens.findByTokenHash(tokenHash)).willReturn(Optional.of(tokenEntity));

            assertThatThrownBy(() -> authService.resetPassword(
                    new AuthDtos.ResetPasswordRequest(rawToken, "NewSecret@123")
            )).isInstanceOf(AppExceptions.BadRequestException.class)
              .hasMessageContaining("không hợp lệ hoặc đã hết hạn");
        }

        @Test
        @DisplayName("Token đã sử dụng trước đó -> Từ chối và ném BadRequestException")
        void givenAlreadyUsedToken_whenResetPassword_thenThrowsBadRequestException() {
            String rawToken = "used-token-123";
            String tokenHash = JwtService.sha256Hex(rawToken);

            Instant now = Instant.now();
            PasswordResetTokenEntity tokenEntity = new PasswordResetTokenEntity(
                    "token-id-1", "user-1", tokenHash, now.plus(Duration.ofMinutes(15)), now.minusSeconds(60), now
            );

            given(passwordResetTokens.findByTokenHash(tokenHash)).willReturn(Optional.of(tokenEntity));

            assertThatThrownBy(() -> authService.resetPassword(
                    new AuthDtos.ResetPasswordRequest(rawToken, "NewSecret@123")
            )).isInstanceOf(AppExceptions.BadRequestException.class)
              .hasMessageContaining("không hợp lệ hoặc đã hết hạn");
        }
    }

    @Nested
    @DisplayName("3. Logout Tests")
    class LogoutTests {

        @Test
        @DisplayName("Đăng xuất thành công -> Lưu hash của Bearer access token vào revokedTokens")
        void givenLogoutRequested_whenCompleted_thenTokenRevokedOnServer() {
            String rawToken = "jwt.access.token";
            String bearer = "Bearer " + rawToken;
            String tokenHash = JwtService.sha256Hex(rawToken);

            io.jsonwebtoken.Claims claims = org.mockito.Mockito.mock(io.jsonwebtoken.Claims.class);
            given(jwtService.parse(rawToken)).willReturn(claims);
            given(claims.getExpiration()).willReturn(java.util.Date.from(Instant.now().plus(Duration.ofHours(1))));
            given(revokedTokens.existsByTokenHash(tokenHash)).willReturn(false);

            UserEntity user = new UserEntity("user-1", "user@example.com", "hash", "Nguyễn Văn A", "0901234567", true, Instant.now(), Instant.now());
            AppUserDetails principal = new AppUserDetails(user, Collections.emptyList());

            AuthDtos.SimpleMessageResponse response = authService.logout(bearer, null, principal);

            assertThat(response.message()).isEqualTo("Đăng xuất thành công");
            ArgumentCaptor<RevokedTokenEntity> captor = ArgumentCaptor.forClass(RevokedTokenEntity.class);
            verify(revokedTokens).save(captor.capture());
            assertThat(captor.getValue().getTokenHash()).isEqualTo(tokenHash);
            assertThat(captor.getValue().getUserId()).isEqualTo("user-1");
        }
    }

}
