package com.medsched.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Hợp đồng dữ liệu (request/response) của phân hệ xác thực.
 * Gom vào một file để các contract liên quan nằm cạnh nhau, dễ đối chiếu khi
 * frontend gọi API.
 */
public final class AuthDtos {

    private AuthDtos() {
    }

    /** Bệnh nhân tự đăng ký tài khoản (Customer - Register). */
    public record RegisterRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không đúng định dạng")
            @Size(max = 255, message = "Email tối đa 255 ký tự")
            String email,

            // BCrypt chỉ băm 72 byte đầu nên giới hạn trên ở 72 để không âm thầm cắt mật khẩu.
            @NotBlank(message = "Mật khẩu không được để trống")
            @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự")
            String password,

            @NotBlank(message = "Họ tên không được để trống")
            @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
            String fullName,

            @Pattern(regexp = "^$|^0[0-9]{8,10}$", message = "Số điện thoại phải bắt đầu bằng 0 và có 9-11 số")
            String phone) {
    }

    /** Dùng chung cho cả 4 vai trò: Customer, Doctor, Staff, Admin. */
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
     * @param expiresIn số giây còn hiệu lực của access token
     * @param roles     danh sách quyền, gồm cả quyền có phạm vi chi nhánh
     *                  (ví dụ {@code ROLE_STAFF@<centerId>}) để frontend biết
     *                  người này làm việc ở cơ sở nào
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
