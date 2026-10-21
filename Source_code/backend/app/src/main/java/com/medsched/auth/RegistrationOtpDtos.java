package com.medsched.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Hợp đồng dữ liệu Request / Response cho quy trình xác thực OTP đăng ký tài khoản qua Email.
 */
public final class RegistrationOtpDtos {

    private RegistrationOtpDtos() {
    }

    /**
     * Yêu cầu gửi mã OTP 4 số khi người dùng điền form đăng ký.
     */
    public record RequestOtpRequest(
            @NotBlank(message = "Họ và tên không được để trống")
            @Size(min = 2, max = 50, message = "Họ và tên phải từ 2 đến 50 ký tự")
            String fullName,

            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không đúng định dạng")
            @Size(max = 255, message = "Email tối đa 255 ký tự")
            String email,

            @NotBlank(message = "Số điện thoại không được để trống")
            @Pattern(regexp = "^(0|\\+84)[35789][0-9]{8}$", message = "Số điện thoại di động Việt Nam phải gồm 10 chữ số (đầu 03, 05, 07, 08, 09)")
            String phone,

            @NotBlank(message = "Mật khẩu không được để trống")
            @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự")
            String password
    ) {}

    /**
     * Phản hồi sau khi tạo phiên đăng ký tạm và gửi mã OTP thành công.
     */
    public record RequestOtpResponse(
            String sessionToken,
            String phoneMasked,
            String emailMasked,
            int expiresInSeconds,
            int resendCooldownSeconds,
            String devDemoOtp,
            String message
    ) {}

    /**
     * Yêu cầu xác thực mã OTP 4 số và kích hoạt tài khoản.
     */
    public record VerifyOtpRequest(
            @NotBlank(message = "Mã phiên đăng ký (sessionToken) không được để trống")
            String sessionToken,

            @NotBlank(message = "Mã OTP không được để trống")
            @Pattern(regexp = "^[0-9]{4}$", message = "Mã OTP phải gồm đúng 4 chữ số")
            String otpCode
    ) {}

    /**
     * Yêu cầu gửi lại mã OTP (Resend).
     */
    public record ResendOtpRequest(
            @NotBlank(message = "Mã phiên đăng ký (sessionToken) không được để trống")
            String sessionToken
    ) {}

    /**
     * Phản hồi khi gửi lại mã OTP thành công.
     */
    public record ResendOtpResponse(
            String message,
            int expiresInSeconds,
            int resendCooldownSeconds,
            String devDemoOtp
    ) {}
}
