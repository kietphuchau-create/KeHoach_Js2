package com.medsched.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Task 1 - Register / Login / Refresh. Ba endpoint duy nhất không cần đăng nhập. */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** Customer - Register. */
    @PostMapping("/register")
    public ResponseEntity<AuthDtos.AuthResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    /** Login dùng chung cho Customer / Doctor / Staff / Admin. */
    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthDtos.AuthResponse refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        return authService.refresh(request);
    }

    /** Quên mật khẩu: Gửi email chứa liên kết đặt lại mật khẩu */
    @PostMapping("/forgot-password")
    public AuthDtos.SimpleMessageResponse forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    /** Đặt lại mật khẩu bằng token một lần */
    @PostMapping("/reset-password")
    public AuthDtos.SimpleMessageResponse resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }

    /** Đăng xuất: Thu hồi token phía server và vô hiệu hóa phiên */
    @PostMapping("/logout")
    public AuthDtos.SimpleMessageResponse logout(
            @org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String bearerToken,
            @RequestBody(required = false) AuthDtos.LogoutRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.medsched.security.AppUserDetails principal) {
        return authService.logout(bearerToken, request, principal);
    }

}
