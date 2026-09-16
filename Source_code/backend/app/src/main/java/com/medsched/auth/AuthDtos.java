package com.medsched.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request/response contracts of the authentication module.
 * Kept in one file so related contracts sit side by side and are easy to check
 * against while wiring the frontend.
 */
public final class AuthDtos {

    private AuthDtos() {
    }

    /** Self-service patient sign-up (Customer - Register). */
    public record RegisterRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không đúng định dạng")
            @Size(max = 255, message = "Email tối đa 255 ký tự")
            String email,

            // BCrypt only hashes the first 72 bytes, so cap the length here instead of truncating silently.
            @NotBlank(message = "Mật khẩu không được để trống")
            @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự")
            String password,

            @NotBlank(message = "Họ tên không được để trống")
            @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
            String fullName,

            @Pattern(regexp = "^$|^0[0-9]{8,10}$", message = "Số điện thoại phải bắt đầu bằng 0 và có 9-11 số")
            String phone) {
    }

    /** Shared by all four roles: Customer, Doctor, Staff, Admin. */
    public record LoginRequest(
            @NotBlank(message = "Email không được để trống")
            String email,

            @NotBlank(message = "Mật khẩu không được để trống")
            String password) {
    }

    public record RefreshRequest(
            @NotBlank(message = "Refresh token không được để trống")
            String refreshToken) {
    }

    /**
     * @param expiresIn remaining lifetime of the access token, in seconds
     * @param roles     granted authorities, including branch-scoped ones
     *                  (e.g. {@code ROLE_STAFF@<centerId>}) so the frontend knows
     *                  which medical center this person works at
     */
    public record AuthResponse(String tokenType,
                               String accessToken,
                               String refreshToken,
                               long expiresIn,
                               String userId,
                               String email,
                               String fullName,
                               List<String> roles) {
    }

}
