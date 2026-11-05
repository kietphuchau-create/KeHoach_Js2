package com.medsched.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Data Transfer Objects cho luồng Khôi phục mật khẩu qua Email OTP (REQ-AUTH-05 - SRS Chương 5 & 10).
 */
public class PasswordResetDtos {

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không đúng định dạng")
            String email
    ) {}

    public record ForgotPasswordResponse(
            String message,
            String email,
            int expiresInMinutes
    ) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Mã xác thực hoặc token không được để trống")
            String token,

            @NotBlank(message = "Mật khẩu mới không được để trống")
            @Size(min = 8, max = 72, message = "Mật khẩu mới phải từ 8 đến 72 ký tự")
            String newPassword
    ) {}

    public record ResetPasswordResponse(
            String message
    ) {}
}

