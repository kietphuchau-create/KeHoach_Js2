package com.medsched.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller xử lý toàn bộ các tác vụ Xác thực & Khôi phục mật khẩu công khai (REQ-AUTH-01 & REQ-AUTH-05 - SRS Chương 5 & 10).
 */
@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
public class AuthController {

    private final AuthService authService;
    private final RegistrationOtpService registrationOtpService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService,
                          RegistrationOtpService registrationOtpService,
                          PasswordResetService passwordResetService) {
        this.authService = authService;
        this.registrationOtpService = registrationOtpService;
        this.passwordResetService = passwordResetService;
    }

    /** Customer - Register trực tiếp không qua OTP (Legacy/Internal API). */
    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    /** BƯỚC 1: Yêu cầu gửi mã OTP 4 số qua Email để đăng ký. */
    @PostMapping("/request-otp")
    public ResponseEntity<RegistrationOtpDtos.RequestOtpResponse> requestOtp(@Valid @RequestBody RegistrationOtpDtos.RequestOtpRequest request) {
        return ResponseEntity.ok(registrationOtpService.requestOtp(request));
    }

    /** BƯỚC 2: Xác thực mã OTP 4 số và tạo tài khoản chính thức. */
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthDtos.AuthResponse> verifyOtp(@Valid @RequestBody RegistrationOtpDtos.VerifyOtpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(registrationOtpService.verifyOtp(request));
    }

    /** BƯỚC 3: Gửi lại mã OTP qua Email. */
    @PostMapping("/resend-otp")
    public ResponseEntity<RegistrationOtpDtos.ResendOtpResponse> resendOtp(@Valid @RequestBody RegistrationOtpDtos.ResendOtpRequest request) {
        return ResponseEntity.ok(registrationOtpService.resendOtp(request));
    }

    /** BƯỚC 4: Quên mật khẩu - Gửi mã OTP 6 số và Token khôi phục qua Email (REQ-AUTH-05). */
    @PostMapping("/forgot-password")
    public ResponseEntity<PasswordResetDtos.ForgotPasswordResponse> forgotPassword(
            @Valid @RequestBody PasswordResetDtos.ForgotPasswordRequest request) {
        return ResponseEntity.ok(passwordResetService.processForgotPassword(request));
    }

    /** BƯỚC 5: Đặt lại mật khẩu mới bằng OTP 6 số hoặc Token (REQ-AUTH-05). */
    @PostMapping("/reset-password")
    public ResponseEntity<PasswordResetDtos.ResetPasswordResponse> resetPassword(
            @Valid @RequestBody PasswordResetDtos.ResetPasswordRequest request) {
        return ResponseEntity.ok(passwordResetService.processResetPassword(request));
    }

    /** One login endpoint shared by Customer / Doctor / Staff / Admin. */
    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthDtos.AuthResponse refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        return authService.refresh(request);
    }

}
